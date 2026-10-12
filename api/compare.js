const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'compare.html');
    let html = fs.readFileSync(file, 'utf8');
    const tag = '<script src="/live-prices.js" defer></script>';
    if (!html.includes('/live-prices.js')) {
      html = html.replace('</body>', `${tag}\n</body>`);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Unable to render comparison page');
  }
};
