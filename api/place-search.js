export default async function handler(req, res) {
  const rawQ = Array.isArray(req.query?.q) ? req.query.q[0] : req.query?.q;
  const city = Array.isArray(req.query?.city) ? req.query.city[0] : req.query?.city;
  const q = String(rawQ || '').trim();

  if (q.length < 2) {
    res.status(400).json({ error: 'query_too_short' });
    return;
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    'accept-language': 'ko,en',
    q,
  });

  if (city === 'hong-kong') {
    params.set('countrycodes', 'hk');
  } else if (city === 'new-york') {
    params.set('countrycodes', 'us');
    params.set('bounded', '1');
    params.set('viewbox', '-74.03,40.88,-73.90,40.68');
  } else {
    res.status(400).json({ error: 'unsupported_city' });
    return;
  }

  try {
    const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'ko,en;q=0.8',
        'User-Agent': 'CITYTOURBUS.KR/1.0 (+https://www.citytourbus.kr/)'
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream_error', status: upstream.status });
      return;
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error) {
    res.status(502).json({ error: 'search_failed' });
  }
}
