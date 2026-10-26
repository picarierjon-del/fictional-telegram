const reply = (res, status, data) => {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
};
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "Metodo non consentito." });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return reply(res, 500, {
      error: "Configura OPENAI_API_KEY nelle impostazioni Vercel."
    });
  }
  let body;
  try {
    body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;
  } catch {
    return reply(res, 400, { error: "JSON non valido." });
  }
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-20)
    .filter(m =>
      m &&
      ["user", "assistant"].includes(m.role) &&
      typeof m.content === "string"
    )
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 2000)
    }));
  if (!messages.length) {
    return reply(res, 400, { error: "Manca il messaggio." });
  }
  const catalog = JSON.stringify(body.catalog || {
    status: "non disponibile"
  }).slice(0, 12000);
  const instructions = `
Sei l'operatore telefonico di Pizzeria L'Amalfitana.
Parla in italiano naturale, cortese e spontaneo.
Fai una domanda alla volta e non essere insistente.
Raccogli le pizze e le varianti richieste: ingredienti esclusi,
aggiunte, pizza baby e metà e metà.
Dopo aver raccolto le pizze, chiedi se preferisce l'impasto
classico oppure un impasto alternativo. Proponi poi, una sola volta,
una bibita oppure un dolce.
Raccogli asporto o consegna, cognome, indirizzo per la consegna
e orario desiderato. Alla fine riepiloga e chiedi conferma.
Non inventare prodotti, prezzi, disponibilità o fasce orarie.
Il catalogo seguente è solo uno snapshot del browser e potrebbe
non essere aggiornato: non presentarlo come dato verificato.
Questa è esclusivamente una DEMO: non creare, inviare o stampare
ordini e non modificare le giacenze.
Catalogo ricevuto: ${catalog}
`;
  try {
    const upstream = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions,
          input: messages,
          max_output_tokens: 450,
          store: false
        })
      }
    );
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("OpenAI error:", upstream.status);
      return reply(res, 502, {
        error: upstream.status === 401
          ? "Chiave API non valida."
          : upstream.status === 429
            ? "Limite API raggiunto o credito insufficiente."
            : "OpenAI non ha completato la richiesta."
      });
    }
    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();
    if (!answer) {
      return reply(res, 502, { error: "Risposta OpenAI vuota." });
    }
    return reply(res, 200, {
      answer,
      model: data.model || process.env.OPENAI_MODEL || "gpt-4.1-mini"
    });
  } catch (error) {
    console.error("Errore connessione OpenAI:", error?.message);
    return reply(res, 500, {
      error: "Errore temporaneo di connessione."
    });
  }
}
