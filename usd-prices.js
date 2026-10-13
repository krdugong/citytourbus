(() => {
  const FALLBACK = {
    USD: 1,
    AED: 3.6725,
    GBP: 0.76,
    EUR: 0.86,
    JPY: 152,
    AUD: 1.51,
    CAD: 1.39,
    NZD: 1.72,
    SGD: 1.29,
    HKD: 7.78
  };

  const CACHE_KEY = 'ctb-usd-rates-v1';
  const CACHE_TTL = 12 * 60 * 60 * 1000;
  let rates = {...FALLBACK};

  const SYMBOLS = [
    {re:/\bAED\s*([\d,.]+)/g, code:'AED'},
    {re:/\bUS\$\s*([\d,.]+)/g, code:'USD'},
    {re:/\bUSD\s*([\d,.]+)/g, code:'USD'},
    {re:/\bA\$\s*([\d,.]+)/g, code:'AUD'},
    {re:/\bAU\$\s*([\d,.]+)/g, code:'AUD'},
    {re:/\bCA\$\s*([\d,.]+)/g, code:'CAD'},
    {re:/\bC\$\s*([\d,.]+)/g, code:'CAD'},
    {re:/\bNZ\$\s*([\d,.]+)/g, code:'NZD'},
    {re:/\bSG\$\s*([\d,.]+)/g, code:'SGD'},
    {re:/\bHK\$\s*([\d,.]+)/g, code:'HKD'},
    {re:/£\s*([\d,.]+)/g, code:'GBP'},
    {re:/€\s*([\d,.]+)/g, code:'EUR'},
    {re:/¥\s*([\d,.]+)/g, code:'JPY'},
    {re:/(?<![A-Z])\$\s*([\d,.]+)/g, code:'USD'}
  ];

  function fmtUsd(n) {
    if (!Number.isFinite(n)) return '';
    let digits = 2;
    if (n >= 100) digits = 0;
    else if (n >= 10) digits = 2;
    return `US$${n.toFixed(digits).replace(/\.00$/,'')}`;
  }

  function convertAmount(amount, code) {
    const r = rates[code];
    if (!r || !Number.isFinite(amount)) return null;
    return code === 'USD' ? amount : amount / r;
  }

  function convertString(text) {
    if (!text || typeof text !== 'string' || text.includes('현지가')) return text;
    let out = text;
    for (const {re, code} of SYMBOLS) {
      out = out.replace(re, (_, raw) => {
        const amount = Number(String(raw).replace(/,/g,''));
        const usd = convertAmount(amount, code);
        return usd == null ? _ : fmtUsd(usd);
      });
    }
    return out;
  }

  function normalizeData() {
    if (typeof CITIES === 'undefined') return;
    Object.values(CITIES).forEach(city => {
      ['cs','bb'].forEach(k => {
        if (city[k]?.price) city[k].price = convertString(city[k].price);
        if (Array.isArray(city[k]?.feats)) city[k].feats = city[k].feats.map(convertString);
      });
      if (Array.isArray(city.tours)) city.tours.forEach(t => {
        if (t.price) t.price = convertString(t.price);
        if (t.sub) t.sub = convertString(t.sub);
        if (Array.isArray(t.tags)) t.tags = t.tags.map(convertString);
      });
      if (Array.isArray(city.upsell)) city.upsell.forEach(u => {
        if (u.price) u.price = convertString(u.price);
      });
    });

    // Current Big Bus Dubai official screenshot supplied by site owner, 2026-10-13.
    const dubai = CITIES.dubai;
    if (dubai?.bb) dubai.bb.price = 'US$40.80';
    if (Array.isArray(dubai?.tours)) {
      dubai.tours.forEach(t => {
        if ((t.prov || '').toLowerCase().includes('big bus')) t.price = 'US$40.80~';
      });
    }
  }

  function normalizeVisible(root=document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) return;
      const next = convertString(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function addUsdNote() {
    const area = document.getElementById('area');
    if (!area || area.querySelector('.usd-price-note')) return;
    const note = document.createElement('div');
    note.className = 'notice anim usd-price-note';
    note.style.borderLeftColor = '#1d1d1f';
    note.innerHTML = '<div><div class="notice-t">가격은 USD로 통일해 표시합니다</div><div class="notice-s">도시 간 비교가 쉽도록 현지 통화 가격은 US$로 환산합니다. 실제 결제 통화와 최종 금액은 예약 페이지에서 확인하세요.</div></div>';
    area.prepend(note);
  }

  function rerender() {
    normalizeData();
    if (typeof render === 'function' && typeof active !== 'undefined') {
      try { render(active); } catch (_) {}
    }
    normalizeVisible();
    addUsdNote();
  }

  function loadCached() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.ts < CACHE_TTL && c.rates) rates = {...rates, ...c.rates};
    } catch (_) {}
  }

  async function refreshRates() {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD', {cache:'no-store'});
      if (!r.ok) return;
      const j = await r.json();
      if (!j?.rates) return;
      const picked = {};
      Object.keys(FALLBACK).forEach(k => { if (j.rates[k]) picked[k] = Number(j.rates[k]); });
      rates = {...rates, ...picked, USD:1};
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(), rates:picked})); } catch (_) {}
      rerender();
    } catch (_) {}
  }

  loadCached();
  rerender();

  const observer = new MutationObserver(muts => {
    if (muts.some(m => m.addedNodes.length || m.type === 'characterData')) {
      requestAnimationFrame(() => {
        normalizeVisible();
        addUsdNote();
      });
    }
  });
  observer.observe(document.body, {subtree:true, childList:true, characterData:true});

  refreshRates();
})();
