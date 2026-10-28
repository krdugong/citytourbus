// Google Analytics (GA4) for every page, plus click events for outbound and affiliate links.
// Loaded from <head> next to gtag.js. Events: affiliate_click (booking / GetYourGuide links) and outbound_click.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-BS2Y7SJ7BT');

(function () {
  var CJ = /(^|\.)(jdoqocy|dpbolvw|anrdoezrs|kqzyfj|tkqlhce)\.(com|net)$/;
  function partnerOf(host) {
    if (/getyourguide\./.test(host)) return 'getyourguide';
    if (/city-sightseeing\./.test(host)) return 'city_sightseeing';
    if (/bigbustours\./.test(host)) return 'big_bus';
    if (/tootbus\./.test(host)) return 'tootbus';
    return '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (_) { return; }
    if (!/^https?:$/.test(u.protocol) || u.hostname === location.hostname) return;
    var host = u.hostname.replace(/^www\./, '');
    var dest = host;
    if (CJ.test(host)) {
      // CJ affiliate links carry the real destination in ?url=
      try { dest = new URL(u.searchParams.get('url')).hostname.replace(/^www\./, ''); } catch (_) {}
    }
    var partner = partnerOf(dest);
    var affiliate = CJ.test(host) || /sponsored/.test(a.rel) || /partner_id=/.test(u.search);
    gtag('event', affiliate ? 'affiliate_click' : 'outbound_click', {
      partner: partner || dest,
      link_domain: dest,
      link_text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      link_url: u.href.slice(0, 300),
      page_path: location.pathname,
      transport_type: 'beacon'
    });
  }, true);
})();
