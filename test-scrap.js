// test-scrap.js
const scrapMercadoLivre = require('./scrapers/mercadolivre');

(async () => {
  const url = 'https://mercadolivre.com/sec/2jwjj7G';
  const produto = await scrapMercadoLivre(url);
  console.log(produto);
})();
