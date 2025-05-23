const axios = require("axios");
const cheerio = require("cheerio");

async function scrapMercadoLivre(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const finalUrl = response.request.res.responseUrl;
    const html = response.data;
    const $ = cheerio.load(html);

    const title =
      $("h1.ui-pdp-title").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "";

    // Tenta capturar o preço usando diferentes seletores
    let price =
      $('[data-testid="price-value"]').first().text().trim() ||
      $('meta[property="product:price:amount"]').attr("content") ||
      "";

    // Se ainda não encontrou, tenta capturar preço por partes (ex: parte inteira e decimal)
    if (!price) {
      const priceInt = $(".andes-money-amount__fraction").first().text().trim();
      const priceDec = $(".andes-money-amount__cents").first().text().trim();
      if (priceInt) {
        price = priceInt + (priceDec ? "," + priceDec : "");
      }
    }

    // Preço original (riscado)
    let originalInt = $(
      "s.andes-money-amount--previous .andes-money-amount__fraction"
    )
      .first()
      .text()
      .trim();
    let originalCents = $(
      "s.andes-money-amount--previous .andes-money-amount__cents"
    )
      .first()
      .text()
      .trim();
    let originalPrice = null;
    if (originalInt) {
      originalPrice = originalInt + (originalCents ? "," + originalCents : "");
    }

    // Preço promocional (atual, com desconto)
    let promoPrice = null;
    // Busca o bloco de preço que NÃO tem a classe --previous (não riscado)
    let promoBlock = $(".ui-pdp-price__second-line .andes-money-amount")
      .filter(function () {
        return !$(this).hasClass("andes-money-amount--previous");
      })
      .first();

    let promoInt = promoBlock
      .find(".andes-money-amount__fraction")
      .first()
      .text()
      .trim();
    let promoCents = promoBlock
      .find(".andes-money-amount__cents")
      .first()
      .text()
      .trim();

    if (promoInt) {
      promoPrice = promoInt + (promoCents ? "," + promoCents : "");
    } else {
      // Busca em qualquer .andes-money-amount fora de <s>
      let fallbackBlock = $(".andes-money-amount")
        .filter(function () {
          return (
            !$(this).hasClass("andes-money-amount--previous") &&
            $(this).closest("s.andes-money-amount--previous").length === 0
          );
        })
        .first();

      let fallbackInt = fallbackBlock
        .find(".andes-money-amount__fraction")
        .first()
        .text()
        .trim();
      let fallbackCents = fallbackBlock
        .find(".andes-money-amount__cents")
        .first()
        .text()
        .trim();

      if (fallbackInt) {
        promoPrice = fallbackInt + (fallbackCents ? "," + fallbackCents : "");
      } else {
        // fallback para meta tag global
        let metaPromo = $('[itemprop="price"]').attr("content");
        if (metaPromo) {
          promoPrice = metaPromo.replace(".", ",");
        } else {
          // fallback para casos antigos ou diferentes
          fallbackInt = $('[data-testid="price-value"]').first().text().trim();
          if (fallbackInt) promoPrice = fallbackInt;
        }
      }
    }

    // Percentual de desconto (opcional)
    let discountPercent =
      $(".andes-money-amount__discount").first().text().trim() || null;

    const image =
      $("img.ui-pdp-image").first().attr("src") ||
      $('meta[property="og:image"]').attr("content") ||
      "";

    return {
      title: title || "Erro na extração",
      price: promoPrice || "N/A",
      originalPrice: originalPrice || null,
      discount: discountPercent,
      image: image || "",
      url: finalUrl,
    };
  } catch (err) {
    console.error("Erro ao fazer scraping:", err.message);
    return {
      title: "Erro na extração",
      price: "N/A",
      image: "",
      url,
    };
  }
}

module.exports = scrapMercadoLivre;
