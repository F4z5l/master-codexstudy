// Vercel serverless proxy: browser -> /api/ms/<endpoint> -> upstream API.
// Browser se direct call CORS ki wajah se fail hota hai, isliye server-side forward karte hain.
// Upstream change karna ho to Vercel env var MS_UPSTREAM set karo (e.g. https://your-site/api/ms).
const UPSTREAM = (process.env.MS_UPSTREAM || "https://mastersahab.studybeepro.site/api/ms").replace(/\/+$/, "");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();

  const path = String(req.url || "").split("?")[0].replace(/^\/api\/ms/, "");
  if (!/^\/[a-zA-Z0-9_\/-]+$/.test(path)) return res.status(400).json({ error: "Bad path" });

  try {
    const init = { method: req.method, headers: { Accept: "application/json" } };
    if (req.method === "POST") {
      init.headers["Content-Type"] = "application/json";
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    }
    const upstream = await fetch(UPSTREAM + path, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.setHeader("Cache-Control", "no-store");
    return res.send(text);
  } catch (error) {
    return res.status(502).json({ error: "Upstream request failed", detail: String(error && error.message || error) });
  }
};
