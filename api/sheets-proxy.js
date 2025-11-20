// api/sheets-proxy.js

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzaEkdVkE6uWOiQOD8oN-eCF6FE0hp-xvuJLLbnMJXRijC9lRCP77DFgOxTr8y-zDq9ag/exec";

export default async function handler(req, res) {
  // Libera CORS para o seu GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "https://guilhermepocops.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method === "POST") {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {})
      });
      const data = await resp.text();
      return res.status(200).send(data);
    }

    if (req.method === "GET") {
      const resp = await fetch(APPS_SCRIPT_URL);
      const data = await resp.text();
      return res.status(200).send(data);
    }

    return res.status(405).json({ ok: false, error: "Método não permitido" });
  } catch (err) {
    console.error("Erro no proxy:", err);
    return res.status(500).json({ ok: false, error: "Erro no proxy" });
  }
}
