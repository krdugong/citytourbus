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

  const cityConfig = {
    // Nominatim tags Hong Kong places with country_code "cn", so "hk" alone returned nothing; the viewbox keeps results inside Hong Kong
    'hong-kong': { countrycodes: 'hk,cn', bounded: '1', viewbox: '113.83,22.56,114.41,22.15' },
    'new-york': { countrycodes: 'us', bounded: '1', viewbox: '-74.03,40.88,-73.90,40.68' },
    paris: { countrycodes: 'fr', bounded: '1', viewbox: '2.20,48.92,2.42,48.80' },
    london: { countrycodes: 'gb', bounded: '1', viewbox: '-0.25,51.56,0.02,51.45' },
    rome: { countrycodes: 'it', bounded: '1', viewbox: '12.40,41.95,12.58,41.82' },
    dubai: { countrycodes: 'ae', bounded: '1', viewbox: '55.08,25.35,55.40,24.98' },
    barcelona: { countrycodes: 'es', bounded: '1', viewbox: '2.05,41.47,2.24,41.32' },
    seoul: { countrycodes: 'kr', bounded: '1', viewbox: '126.80,37.70,127.20,37.42' },
    busan: { countrycodes: 'kr', bounded: '1', viewbox: '128.85,35.33,129.30,34.98' },
  };

  const selected = cityConfig[city];
  if (!selected) {
    res.status(400).json({ error: 'unsupported_city' });
    return;
  }
  Object.entries(selected).forEach(([k, v]) => params.set(k, v));

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
