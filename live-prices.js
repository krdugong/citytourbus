(() => {
  const AFFILIATE_HOSTS = ['jdoqocy.com','dpbolvw.net','anrdoezrs.net','kqzyfj.com','tkqlhce.com'];
  let liveData = null;
  let sourceData = null;

  const hasGlobals = () => typeof CITIES !== 'undefined' && typeof render === 'function';

  function money(currency, value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
    const n = Number(value);
    const shown = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
    const cur = (currency || '').toUpperCase();
    if (['£','€','$','¥','A$','AU$','CA$','C$','US$','NZ$','HK$','SG$'].includes(cur)) return `${cur}${shown}`;
    if (cur === 'GBP') return `£${shown}`;
    if (cur === 'EUR') return `€${shown}`;
    if (cur === 'USD') return `$${shown}`;
    if (cur === 'JPY') return `¥${shown}`;
    if (cur === 'AED') return `AED ${shown}`;
    return `${currency || ''}${shown}`.trim();
  }

  function shortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getMonth()+1}/${d.getDate()}`;
  }

  function addFeat(feats, text) {
    if (!text || feats.includes(text)) return;
    feats.push(text);
  }

  function baseOperator(cityKey, op, sourceCfg) {
    const city = CITIES[cityKey];
    if (!city || !sourceCfg) return null;
    const key = op === 'bb' ? 'bb' : 'cs';
    if (!city[key]) {
      city[key] = {
        price: '',
        link: sourceCfg.affiliate,
        feats: [op === 'bb' ? 'Big Bus 운영' : 'City Sightseeing 운영']
      };
    }
    city[key].link = sourceCfg.affiliate;
    city[key].feats = Array.isArray(city[key].feats) ? city[key].feats : [];
    return city[key];
  }

  function patchTourLinks(cityKey, op, affiliate) {
    const city = CITIES[cityKey];
    if (!city || !Array.isArray(city.tours)) return;
    const needle = op === 'bb' ? 'big bus' : 'city sightseeing';
    city.tours.forEach(t => {
      if ((t.prov || '').toLowerCase().includes(needle)) t.directLink = affiliate;
    });

    if (op === 'bb' && !city.tours.some(t => (t.prov || '').toLowerCase().includes('big bus'))) {
      city.tours.unshift({
        id: '',
        prov: 'Big Bus Tours',
        color: 'var(--navy)',
        name: `Big Bus ${city.name} — 홉온홉오프`,
        sub: '공식 홈페이지의 현재 온라인 가격을 매일 확인합니다.',
        price: '',
        rating: '—',
        cnt: '공홈',
        tags: ['공홈 가격 확인'],
        directLink: affiliate
      });
    }
  }

  function applyOne(cityKey, op, sourceCfg, live) {
    const d = baseOperator(cityKey, op, sourceCfg);
    if (!d) return;
    patchTourLinks(cityKey, op, sourceCfg.affiliate);

    if (!live || !['ok','stale'].includes(live.status)) return;
    const displayed = money(live.currency, live.salePrice);
    if (displayed) d.price = displayed;

    const feats = d.feats;
    // Remove previous live-only labels before rebuilding them.
    d.feats = feats.filter(x => !/^(공홈 정상가|공홈 자체|CJTRAVEL10 추가|중복 확인|자체 할인과 코드|코드 중복 여부|가격 확인|마지막 정상 가격)/.test(x));

    if (live.regularPrice && live.salePrice && live.regularPrice > live.salePrice) {
      addFeat(d.feats, `공홈 정상가 ${money(live.currency, live.regularPrice)}`);
    }
    if (live.onsiteDiscountPercent) {
      addFeat(d.feats, `공홈 자체 ${live.onsiteDiscountPercent}% 할인`);
    }

    if (op === 'cs') {
      const stack = live.stacking || {};
      const codePct = live.promoPercent || 10;
      if (stack.status === 'verified-stackable') {
        addFeat(d.feats, `CJTRAVEL10 추가 ${codePct}% 중복`);
        if (live.codeAppliedPriceEstimate) addFeat(d.feats, `코드 적용 예상 ${money(live.currency, live.codeAppliedPriceEstimate)}`);
        if (live.effectiveDiscountPercent) addFeat(d.feats, `중복 확인 · 총 약 ${live.effectiveDiscountPercent}%`);
      } else if (stack.status === 'verified-not-stackable') {
        addFeat(d.feats, '자체 할인과 코드 중복 불가');
      } else if (live.onsiteDiscountPercent) {
        addFeat(d.feats, '코드 중복 여부 결제창 확인');
      } else {
        addFeat(d.feats, `CJTRAVEL10 ${codePct}%`);
      }
    }

    if (live.status === 'stale') addFeat(d.feats, `마지막 정상 가격 ${shortDate(live.lastSuccessAt)}`);
    else addFeat(d.feats, `가격 확인 ${shortDate(live.lastSuccessAt || live.checkedAt)}`);

    const city = CITIES[cityKey];
    if (city && Array.isArray(city.tours)) {
      const needle = op === 'bb' ? 'big bus' : 'city sightseeing';
      city.tours.forEach(t => {
        if ((t.prov || '').toLowerCase().includes(needle) && displayed) {
          t.price = `${displayed}~`;
          t.directLink = sourceCfg.affiliate;
          if (live.onsiteDiscountPercent && !t.tags.includes(`공홈 ${live.onsiteDiscountPercent}% 할인`)) {
            t.tags.push(`공홈 ${live.onsiteDiscountPercent}% 할인`);
          }
        }
      });
    }
  }

  function markSponsoredLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
      try {
        const host = new URL(a.href, location.href).hostname.replace(/^www\./,'');
        if (AFFILIATE_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
          a.rel = 'sponsored noopener';
        }
      } catch (_) {}
    });
  }

  function addFreshnessNotice(cityKey) {
    const area = document.getElementById('area');
    if (!area || !liveData) return;
    const city = liveData.cities?.[cityKey];
    if (!city) return;
    const checks = [city.bb, city.cs].filter(Boolean);
    const ok = checks.filter(x => x.status === 'ok').length;
    const stale = checks.filter(x => x.status === 'stale').length;
    const generated = shortDate(liveData.generatedAt);
    const old = area.querySelector('.live-price-note');
    if (old) old.remove();
    const note = document.createElement('div');
    note.className = 'notice anim live-price-note';
    note.style.borderLeftColor = stale ? '#C8A040' : '#12B76A';
    note.innerHTML = `<div><div class="notice-t">공홈 가격 자동 확인 ${generated || ''}</div><div class="notice-s">Big Bus·City Sightseeing 공식 페이지를 기준으로 하루 2회 확인합니다. ${ok ? `정상 ${ok}개` : ''}${stale ? ` · 마지막 정상값 ${stale}개` : ''} · 실제 결제 금액은 날짜·인원·상품에 따라 달라질 수 있습니다.</div></div>`;
    area.prepend(note);
  }

  function applyAll() {
    if (!hasGlobals() || !sourceData) return;
    const csSources = sourceData.citySightseeing?.cities || {};
    const bbSources = sourceData.bigBus?.cities || {};
    const cities = new Set([...Object.keys(csSources), ...Object.keys(bbSources)]);
    cities.forEach(cityKey => {
      const live = liveData?.cities?.[cityKey] || {};
      if (bbSources[cityKey]) applyOne(cityKey, 'bb', bbSources[cityKey], live.bb);
      if (csSources[cityKey]) applyOne(cityKey, 'cs', csSources[cityKey], live.cs);
    });
  }

  async function boot() {
    if (!hasGlobals()) return;
    try {
      const [pricesResp, sourcesResp] = await Promise.all([
        fetch(`/prices.json?v=${Date.now()}`, {cache:'no-store'}),
        fetch('/data/price-sources.json', {cache:'no-store'})
      ]);
      if (pricesResp.ok) liveData = await pricesResp.json();
      if (sourcesResp.ok) sourceData = await sourcesResp.json();
      applyAll();

      const originalRender = render;
      render = function(k) {
        originalRender(k);
        markSponsoredLinks();
        addFreshnessNotice(k);
      };
      render(active);
    } catch (err) {
      console.warn('Live price layer unavailable; using embedded fallback data.', err);
      markSponsoredLinks();
    }
  }

  boot();
})();
