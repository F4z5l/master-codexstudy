// Vercel serverless proxy: /api/ms/<endpoint>  ->  <UPSTREAM>/<endpoint>
// vercel.json rewrite /api/ms/:path*  ->  /api/ms?p=:path*
const UPSTREAM = (process.env.MS_UPSTREAM || "https://mastersahab.studybeepro.site/api/ms").replace(/\/+$/, "");
const ORIGIN = new URL(UPSTREAM).origin;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();

  let p = req.query && req.query.p;
  if (Array.isArray(p)) p = p.join("/");
  p = String(p || "").replace(/^\/+/, "");

  // Health check: open https://<your-site>/api/ms/ping
  if (p === "ping") return res.status(200).json({ ok: true, proxy: "codexyt", upstream: UPSTREAM });
  if (!/^[a-zA-Z0-9_\/-]+$/.test(p)) return res.status(400).json({ error: "Bad path", path: p });

  try {
    const init = {
      method: req.method === "POST" ? "POST" : "GET",
      headers: {
        Accept: "application/json",
        Origin: ORIGIN,
        Referer: ORIGIN + "/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
      }
    };
    if (init.method === "POST") {
      init.headers["Content-Type"] = "application/json";
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    }
    const url = UPSTREAM + "/" + p;
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !/json/i.test(type)) {
      return res.status(502).json({
        error: "Upstream " + upstream.status + (/json/i.test(type) ? "" : " (not JSON)"),
        upstreamStatus: upstream.status,
        upstreamUrl: url,
        snippet: text.slice(0, 200)
      });
    }
    res.setHeader("Content-Type", type);
    return res.status(200).send(text);
  } catch (error) {
    return res.status(502).json({ error: "Upstream unreachable", detail: String((error && error.message) || error) });
  }
};
