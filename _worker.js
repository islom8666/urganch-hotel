// Cloudflare Pages (advanced mode): serves the site and forwards booking requests to Telegram.
// Secrets are set in Cloudflare: Settings → Variables and Secrets
//   TELEGRAM_TOKEN   – bot token
//   TELEGRAM_CHAT_ID – chat ids, comma-separated
const esc = (v, n = 100) => String(v ?? "").slice(0, n).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

async function booking(request, env) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let d;
  try { d = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
  if (d.website) return new Response("ok");
  if (!d.name || !d.phone || !d.checkin || !d.checkout) return new Response("Missing fields", { status: 400 });
  const token = env.TELEGRAM_TOKEN, chats = String(env.TELEGRAM_CHAT_ID || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!token || !chats.length) return new Response("Not configured", { status: 500 });
  const text =
`🛎 <b>Новая заявка — urganchhotel.uz</b>

👤 <b>Имя:</b> ${esc(d.name, 80)}
📞 <b>Телефон:</b> ${esc(d.phone, 30)}
🏨 <b>Номер:</b> ${esc(d.room)}
👥 <b>Гостей:</b> ${esc(d.guests, 3)}
🌍 <b>Гражданство:</b> ${esc(d.citizen)}
📅 <b>Заезд:</b> ${esc(d.checkin, 10)}
📅 <b>Выезд:</b> ${esc(d.checkout, 10)}
💰 <b>Сумма:</b> ${esc(d.total, 60) || "—"}
🔤 Язык сайта: ${esc(d.lang, 10)}`;
  const res = await Promise.all(chats.map(chat_id =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML" })
    }).then(r => r.ok).catch(() => false)));
  return res.some(Boolean) ? new Response("ok") : new Response("Telegram error", { status: 502 });
}

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname;
    if (p === "/api/booking" || p === "/.netlify/functions/booking") return booking(request, env);
    return env.ASSETS.fetch(request);
  }
};
