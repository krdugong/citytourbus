module.exports = async function handler(req, res) {
  const url = 'https://www.bigbustours.com/graphql';
  const query = '{storeConfig{code store_code base_currency_code default_display_currency_code}}';
  const out = {};
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({query})
    });
    const text = await r.text();
    out.graphql = {status:r.status, contentType:r.headers.get('content-type'), body:text.slice(0,1200)};
  } catch (e) {
    out.graphql = {error:String(e)};
  }
  try {
    const r = await fetch('https://www.bigbustours.com/en/london/london-tour-tickets-and-passes', {
      headers:{'user-agent':'Mozilla/5.0','accept':'text/html'}
    });
    const text = await r.text();
    out.html = {status:r.status, contentType:r.headers.get('content-type'), body:text.slice(0,500)};
  } catch (e) {
    out.html = {error:String(e)};
  }
  res.setHeader('Cache-Control','no-store');
  res.status(200).json(out);
};
