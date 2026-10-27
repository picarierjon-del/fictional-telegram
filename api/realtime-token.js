export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Metodo non consentito. Usa POST."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const adminKey = process.env.ADMIN_API_KEY;
  const suppliedAdminKey = req.headers["x-admin-key"];

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "OPENAI_API_KEY non configurata sul server."
    });
  }

  if (!adminKey) {
    return res.status(500).json({
      ok: false,
      error: "ADMIN_API_KEY non configurata sul server."
    });
  }

  if (
    typeof suppliedAdminKey !== "string" ||
    suppliedAdminKey.length === 0 ||
    suppliedAdminKey !== adminKey
  ) {
    return res.status(401).json({
      ok: false,
      error: "Chiave amministrativa mancante o non valida."
    });
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expires_after: {
            anchor: "created_at",
            seconds: 600
          },
          session: {
            type: "realtime",
            model: "gpt-realtime",
            instructions:
              "Sei Amalfitana AI, assistente vocale della Pizzeria L'Amalfitana. Parla in italiano, con tono naturale, cortese e conciso. Raccogli le richieste del cliente con attenzione. Non confermare ordini, prezzi, disponibilità o modifiche alle giacenze senza averli verificati tramite i sistemi autorizzati del gestionale."
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Errore OpenAI Realtime:",
        response.status,
        data?.error?.type || "errore API"
      );

      return res.status(502).json({
        ok: false,
        error: "OpenAI non ha creato il token vocale.",
        status: response.status
      });
    }

    if (!data.value) {
      return res.status(502).json({
        ok: false,
        error: "OpenAI non ha restituito il token temporaneo."
      });
    }

    return res.status(200).json({
      ok: true,
      client_secret: {
        value: data.value,
        expires_at: data.expires_at
      },
      expires_at: data.expires_at,
      session: data.session
    });
  } catch (error) {
    console.error(
      "Errore server Realtime:",
      error?.message || "errore sconosciuto"
    );

    return res.status(500).json({
      ok: false,
      error: "Errore interno durante la creazione del token vocale."
    });
  }
}
