export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Metodo non consentito."
    });
  }

  return res.status(200).json({
    ok: true,
    app: "Amalfitana AI",
    message: "Server collegato correttamente.",
    telephony: "non attiva",
    pos: "non collegato",
    printers: "non collegate"
  });
}
