const axios = require("axios");
const cheerio = require("cheerio");

async function resolveMagaluShortUrl(url) {
  // Se for link curto, segue o redirecionamento até o destino final
  if (/divulgador\.magalu\.com/.test(url)) {
    try {
      const resp = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      // O destino está no header 'location'
      if (resp.headers.location) {
        // Pode ser relativo, então monta URL absoluta
        if (resp.headers.location.startsWith("/")) {
          return "https://www.magazinevoce.com.br" + resp.headers.location;
        }
        return resp.headers.location;
      }
    } catch (e) {
      if (e.response && e.response.headers && e.response.headers.location) {
        if (e.response.headers.location.startsWith("/")) {
          return (
            "https://www.magazinevoce.com.br" + e.response.headers.location
          );
        }
        return e.response.headers.location;
      }
    }
  }
  return url;
}

async function scrapMagazineLuiza(url) {
  try {
    // Resolve link curto se necessário
    url = await resolveMagaluShortUrl(url);

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://www.google.com/",
        Cookie: "magalu_device_id=botfakeid; magalu_ab_test=bot",
      },
      maxRedirects: 5,
    });
    const html = response.data;
    const $ = cheerio.load(html);

    // Título
    const title =
      $("h1[data-testid='heading-product-title']").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      "";

    // Preço original (sem desconto)
    let originalPrice =
      $("p[data-testid='price-original']").first().text().replace(/\s/g, "") ||
      null;

    // Preço no cartão
    let cardPrice = $("p[data-testid='installment']")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // Preço no Pix
    let pixPrice = $("p[data-testid='price-value']")
      .first()
      .text()
      .replace(/ou\s*/i, "")
      .replace(/\s/g, "")
      .trim();

    // Desconto Pix
    let pixDiscount = $("span[data-testid='in-cash']")
      .parent()
      .next("span")
      .text()
      .trim();

    // Imagem
    const image =
      $("img[data-testid='image-selected']").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    return {
      title: title || "Erro na extração",
      originalPrice: originalPrice ? originalPrice : null,
      cardPrice: cardPrice || null,
      pixPrice: pixPrice || null,
      pixDiscount: pixDiscount || null,
      image: image || "",
      url,
    };
  } catch (err) {
    console.error("Erro ao fazer scraping Magazine Luiza:", err.message);
    return {
      title: "Erro na extração",
      originalPrice: null,
      cardPrice: null,
      pixPrice: null,
      pixDiscount: null,
      image: "",
      url,
    };
  }
}

module.exports = scrapMagazineLuiza;
