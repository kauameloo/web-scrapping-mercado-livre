const express = require("express");
const app = express();

// Exemplo: https://promolinxy.com.br/r?url=URL_ENCODED
app.get("/r", (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL inválida");
  try {
    const decoded = decodeURIComponent(url);
    // Validação opcional: só permite links do Mercado Livre
    if (!/^https?:\/\/(www\.)?mercadolivre\.com/.test(decoded)) {
      return res.status(400).send("Link não permitido");
    }
    res.redirect(decoded);
  } catch {
    res.status(400).send("URL inválida");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Redirect server running on port", PORT));
