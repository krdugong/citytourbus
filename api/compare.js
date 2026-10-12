const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'compare.html');
    let html = fs.readFileSync(file, 'utf8');
    const styleTag = '<link rel="stylesheet" href="/compare-redesign.css">';
    const scriptTag = '<script src="/live-prices.js" defer></script>';
    if (!html.includes('/compare-redesign.css')) {
      html = html.replace('</head>', `${styleTag}\n</head>`);
    }
    if (!html.includes('/live-prices.js')) {
      html = html.replace('</body>', `${scriptTag}\n</body>`);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Unable to render comparison page');
  }
};
