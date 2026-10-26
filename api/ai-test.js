export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Usa una richiesta POST per testare l'AI."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Chiave OpenAI non configurata su Vercel."
    });
  }

  try {
    const body = req.body || {};
    const messages = body.messages;

    const input = Array.isArray(messages)
      ? messages
      : typeof body.message === "string"
        ? body.message
        : "";

    if (
      !input ||
      (Array.isArray(input) && input.length === 0)
    ) {
      return res.status(400).json({
        ok: false,
        error: "Inserisci un messaggio da inviare all'AI."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "Sei Amalfitana AI, l'assistente della Pizzeria L'Amalfitana. Rispondi in italiano, in modo naturale, cortese e conciso. Questo è un test tecnico: non confermare ordini reali e non dichiarare di aver modificato le giacenze.",
          input,
          max_output_tokens: 450,
          store: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore OpenAI:", response.status, data);

      return res.status(response.status === 429 ? 429 : 502).json({
        ok: false,
        error: response.status === 429
          ? "Limite di utilizzo OpenAI raggiunto. Controlla credito e limiti API."
          : "OpenAI non ha completato la richiesta.",
        status: response.status
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    if (!answer) {
      return res.status(502).json({
        ok: false,
        error: "OpenAI ha risposto senza testo."
      });
    }

    return res.status(200).json({
      ok: true,
      answer,
      model: data.model || "gpt-4.1-mini"
    });

  } catch (error) {
    console.error("Errore API AI:", error);

    return res.status(500).json({
      ok: false,
      error: "Errore interno durante il collegamento all'AI."
    });
  }
}
