from pathlib import Path
import re

p = Path('hong-kong-route-prototype.html')
s = p.read_text()

extra_css = r'''
/* attraction-first planner */
.trip-search{position:relative;margin:14px 0 8px}.trip-search-row{display:flex;gap:7px}.trip-search input{width:100%;height:42px;border:1px solid var(--line);border-radius:12px;padding:0 13px;font-family:inherit;font-size:12px;outline:none;background:#fff}.trip-search input:focus{border-color:#8e8e93;box-shadow:0 0 0 3px rgba(0,0,0,.04)}.clear-trip{flex:0 0 auto;border:1px solid var(--line);background:#fff;border-radius:12px;padding:0 10px;font-size:10px;font-weight:700;cursor:pointer}.clear-trip:hover{background:var(--paper)}
.search-results{display:none;position:absolute;left:0;right:49px;top:46px;z-index:900;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.12);overflow:hidden;max-height:250px;overflow-y:auto}.search-results.show{display:block}.search-hit{width:100%;border:0;border-bottom:1px solid #eeeef1;background:#fff;padding:10px 12px;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px}.search-hit:last-child{border-bottom:0}.search-hit:hover{background:#f5f5f7}.search-hit b{font-size:11px}.search-hit small{display:block;color:var(--sub);font-size:9px;margin-top:2px}.search-hit-routes{display:flex;gap:3px}.mini-route{width:9px;height:9px;border-radius:50%}.mini-route.red{background:var(--red)}.mini-route.green{background:var(--green)}.mini-route.blue{background:var(--blue)}
.planner-title{font-size:18px;font-weight:800;letter-spacing:-.6px;margin:0}.planner-lead{font-size:11px;color:var(--sub);line-height:1.7;margin-top:4px}.selected-pois{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0 2px}.selected-chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 8px;font-size:9px;font-weight:700;cursor:pointer}.selected-chip:after{content:' ×';color:#8e8e93}.selected-chip:hover{background:#f5f5f7}.quick{grid-template-columns:1fr 1fr}.poi{position:relative;padding:10px 10px 10px 34px;min-height:51px}.poi:before{content:'';position:absolute;left:10px;top:14px;width:15px;height:15px;border:1.5px solid #b9b9bf;border-radius:4px;background:#fff}.poi.on:before{content:'✓';background:var(--ink);border-color:var(--ink);color:#fff;font-size:10px;line-height:15px;text-align:center;font-weight:900}.poi.on{background:#fff;border-color:#9b9ba1;box-shadow:none}
.coverage{background:#fff;border:1px solid var(--line);padding:14px}.coverage h4{font-size:12px;margin-bottom:7px}.route-answer{border-radius:12px;background:var(--paper);padding:11px 12px;margin:9px 0 12px;font-size:11px;line-height:1.65}.route-answer strong{font-size:12px}.route-answer .subline{display:block;color:var(--sub);font-size:9px;margin-top:3px}.covrow{grid-template-columns:78px 1fr 34px}.covrow.is-best b{font-weight:900}.covrow button{border:0;background:transparent;padding:0;text-align:left;font:inherit;cursor:pointer}.covrow button:hover{text-decoration:underline}.side-divider{height:1px;background:var(--line);margin:22px 0}.stop-heading{font-size:15px!important}.poi-pin{background:#1d1d1f;color:#fff;border:3px solid #fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.25)}.poi-label{background:#fff;border:1px solid #d8d8dd;border-radius:7px;color:#1d1d1f;font-size:10px;font-weight:800;padding:3px 6px;box-shadow:0 2px 6px rgba(0,0,0,.08)}.leaflet-tooltip.poi-label:before{display:none}
@media(max-width:600px){.quick{grid-template-columns:1fr 1fr}.trip-search input{font-size:16px}.search-results{right:0}.clear-trip{display:none}}
'''
if '/* attraction-first planner */' not in s:
    s = s.replace('</style>', extra_css + '\n</style>', 1)

aside = r'''<aside class="side">
        <h2 class="planner-title">어디를 가고 싶으세요?</h2>
        <div class="planner-lead">관광지를 검색하거나 아래에서 체크하면 <strong>그 장소를 지나는 노선만 지도에 바로 보여드립니다.</strong></div>
        <div class="trip-search">
          <div class="trip-search-row"><input id="poiSearch" type="search" autocomplete="off" placeholder="예: 피크트램, 몽콕, 스탠리, M+"><button class="clear-trip" id="clearPoi" type="button">초기화</button></div>
          <div class="search-results" id="searchResults"></div>
        </div>
        <div class="selected-pois" id="selectedPoiList"></div>
        <div class="side-title">인기 관광지 체크</div>
        <div class="quick" id="poiList"></div>
        <div class="coverage" id="coverage"></div>
        <div class="side-divider"></div>
        <h2 class="stop-heading">선택한 정류장</h2>
        <div class="muted">지도 숫자를 누르면 한국어 기준 상세 정보가 바뀝니다.</div>
        <div class="stop-detail" id="detail"></div>
        <div class="side-title">현재 표시 중인 정류장</div>
        <div class="stoplist" id="stopList"></div>
      </aside>'''
s, n = re.subn(r'<aside class="side">.*?</aside>', aside, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'aside replacement={n}')

planner_js = r'''
<script id="hk-trip-planner">
(()=>{
  const plannerPois=[
    {id:'peak',ko:'빅토리아피크·피크트램',en:'The Peak / Peak Tram',aliases:['피크','빅토리아피크','피크트램','peak'],routes:['red','green'],lat:22.2770,lng:114.1599},
    {id:'central',ko:'센트럴·스타페리',en:'Central / Star Ferry',aliases:['센트럴','스타페리','central','star ferry'],routes:['red','green'],lat:22.2878,lng:114.1595},
    {id:'soho',ko:'소호·미드레벨 에스컬레이터',en:'SoHo / Mid-Levels Escalator',aliases:['소호','미드레벨','에스컬레이터','soho','mid levels'],routes:['red'],lat:22.2834,lng:114.1544},
    {id:'manmo',ko:'만모사원',en:'Man Mo Temple',aliases:['만모','만모사원','man mo'],routes:['red'],lat:22.2841,lng:114.1502},
    {id:'taikwun',ko:'타이쿤·란콰이퐁',en:'Tai Kwun / Lan Kwai Fong',aliases:['타이쿤','란콰이퐁','tai kwun','lan kwai fong'],routes:['red'],lat:22.2814,lng:114.1548},
    {id:'wanchai',ko:'완차이',en:'Wan Chai',aliases:['완차이','wan chai'],routes:['red','green'],lat:22.2807,lng:114.1765},
    {id:'causeway',ko:'코즈웨이베이·소고',en:'Causeway Bay / SOGO',aliases:['코즈웨이베이','소고','causeway bay','sogo'],routes:['red'],lat:22.2803,lng:114.1848},
    {id:'stanley',ko:'스탠리마켓',en:'Stanley Market',aliases:['스탠리','스탠리마켓','stanley'],routes:['green'],lat:22.2187,lng:114.2098},
    {id:'repulse',ko:'리펄스베이',en:'Repulse Bay',aliases:['리펄스','리펄스베이','repulse bay'],routes:['green'],lat:22.2362,lng:114.1971},
    {id:'ocean',ko:'오션파크',en:'Ocean Park',aliases:['오션파크','ocean park'],routes:['green'],lat:22.2465,lng:114.1754},
    {id:'aberdeen',ko:'애버딘',en:'Aberdeen',aliases:['애버딘','aberdeen','삼판'],routes:['green'],lat:22.2478,lng:114.1555},
    {id:'avenue',ko:'침사추이·스타의 거리',en:'Tsim Sha Tsui / Avenue of Stars',aliases:['침사추이','스타의거리','스타의 거리','브루스리','bruce lee','tsim sha tsui','avenue of stars'],routes:['blue'],lat:22.2934,lng:114.1730},
    {id:'temple',ko:'템플스트리트 야시장',en:'Temple Street Night Market',aliases:['템플스트리트','야시장','temple street'],routes:['blue'],lat:22.3076,lng:114.1695},
    {id:'mongkok',ko:'몽콕·레이디스마켓',en:'Mong Kok / Ladies’ Market',aliases:['몽콕','레이디스마켓','여인가','mong kok','ladies market'],routes:['blue'],lat:22.3181,lng:114.1681},
    {id:'mplus',ko:'M+ 뮤지엄',en:'M+ Museum',aliases:['m+','엠플러스','mplus','뮤지엄'],routes:['blue'],lat:22.3008,lng:114.1593},
    {id:'palace',ko:'홍콩 고궁박물관',en:'Hong Kong Palace Museum',aliases:['고궁박물관','홍콩고궁','palace museum'],routes:['blue'],lat:22.3023,lng:114.1546},
    {id:'westkowloon',ko:'홍콩 서구룡역',en:'Hong Kong West Kowloon Station',aliases:['서구룡','서구룡역','west kowloon'],routes:['blue'],lat:22.3035,lng:114.1654}
  ];
  pois.splice(0,pois.length,...plannerPois);
  selectedPoi.clear();
  const poiLayer=L.layerGroup().addTo(map);
  const routeKeys=['red','green','blue'];
  const routeShort={red:'레드',green:'그린',blue:'블루'};
  const escapeHtml=v=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function chosen(){return pois.filter(p=>selectedPoi.has(p.id))}
  function routeHits(rk){return chosen().filter(p=>p.routes.includes(rk))}
  function routeUnion(keys){return chosen().filter(p=>p.routes.some(r=>keys.includes(r))).length}
  function bestCombo(){const c=chosen();if(!c.length)return[];for(const rk of routeKeys)if(routeHits(rk).length===c.length)return[rk];const pairs=[['red','green'],['red','blue'],['green','blue']];const valid=pairs.filter(x=>routeUnion(x)===c.length);if(valid.length)return valid.sort((a,b)=>b.reduce((n,r)=>n+routeHits(r).length,0)-a.reduce((n,r)=>n+routeHits(r).length,0))[0];return routeKeys}
  function showRelevantRoutes(){const c=chosen();if(!c.length){currentRoute='all';Object.values(layers).forEach(l=>{if(!map.hasLayer(l))map.addLayer(l)});document.querySelectorAll('.filter').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route==='all')));poiLayer.clearLayers();map.fitBounds([[22.213,114.145],[22.322,114.214]],{padding:[20,20]});return}currentRoute='all';routeKeys.forEach(rk=>{const visible=routeHits(rk).length>0,l=layers[rk];if(visible&&!map.hasLayer(l))map.addLayer(l);if(!visible&&map.hasLayer(l))map.removeLayer(l)});document.querySelectorAll('.filter').forEach(b=>b.setAttribute('aria-pressed','false'));poiLayer.clearLayers();c.forEach(p=>{const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:'<div class="poi-pin">★</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(poiLayer);marker.bindTooltip(p.ko,{permanent:true,direction:'top',offset:[0,-16],className:'poi-label',opacity:.96})});if(c.length===1)map.flyTo([c[0].lat,c[0].lng],14,{duration:.45});else map.fitBounds(L.latLngBounds(c.map(p=>[p.lat,p.lng])),{padding:[55,55],maxZoom:14})}
  function togglePoi(id){selectedPoi.has(id)?selectedPoi.delete(id):selectedPoi.add(id);renderPlanner();showRelevantRoutes()}
  function renderSelected(){const el=document.getElementById('selectedPoiList');el.innerHTML=chosen().map(p=>`<button class="selected-chip" data-id="${p.id}" type="button">${escapeHtml(p.ko)}</button>`).join('');el.querySelectorAll('button').forEach(b=>b.onclick=()=>togglePoi(b.dataset.id))}
  window.renderPoi=function(){const popular=['peak','stanley','repulse','causeway','avenue','temple','mongkok','mplus','ocean','soho'];document.getElementById('poiList').innerHTML=popular.map(id=>{const p=pois.find(x=>x.id===id);return `<button class="poi ${selectedPoi.has(p.id)?'on':''}" aria-pressed="${selectedPoi.has(p.id)}" data-id="${p.id}" type="button">${escapeHtml(p.ko)}<small>${p.routes.map(r=>routeShort[r]+' 노선').join(' · ')}</small><span class="en">${escapeHtml(p.en)}</span></button>`}).join('');document.querySelectorAll('.poi').forEach(b=>b.onclick=()=>togglePoi(b.dataset.id))};
  window.renderCoverage=function(){const box=document.getElementById('coverage'),c=chosen();if(!c.length){box.innerHTML='<h4>가고 싶은 곳을 선택해보세요.</h4><div style="font-size:10px;color:#777;line-height:1.6">선택하면 그 관광지를 지나는 노선만 지도에 남고, 한 노선으로 전부 갈 수 있는지도 계산합니다.</div>';return}const combo=bestCombo();const allByOne=combo.length===1;const answer=allByOne?`<strong>${routes[combo[0]].ko} 하나로 선택한 ${c.length}곳을 모두 커버할 수 있어요.</strong><span class="subline">지도에는 현재 선택 장소를 지나는 노선만 표시하고 있습니다.</span>`:`<strong>한 노선으로 전부 가기는 어렵습니다.</strong><span class="subline">${combo.map(r=>routes[r].ko).join(' + ')} 조합이 선택한 장소를 모두 커버합니다.</span>`;box.innerHTML=`<h4>내 일정에 맞는 노선</h4><div class="route-answer">${answer}</div>`+routeKeys.map(rk=>{const hit=routeHits(rk).length,pct=Math.round(hit/c.length*100),best=combo.includes(rk);return `<div class="covrow ${best?'is-best':''}"><button type="button" data-focus-route="${rk}">${best?'★ ':''}${routeShort[rk]} 노선</button><span class="bar ${rk}"><i style="width:${pct}%"></i></span><span>${hit}/${c.length}</span></div>`}).join('');box.querySelectorAll('[data-focus-route]').forEach(b=>b.onclick=()=>setRoute(b.dataset.focusRoute))};
  function renderPlanner(){renderPoi();renderSelected();renderCoverage();renderStopList()}
  function searchMatches(q){q=q.trim().toLowerCase();if(!q)return[];return pois.filter(p=>[p.ko,p.en,...(p.aliases||[])].some(x=>x.toLowerCase().includes(q))).slice(0,8)}
  function renderSearch(q){const el=document.getElementById('searchResults'),hits=searchMatches(q);if(!q.trim()){el.classList.remove('show');el.innerHTML='';return}el.classList.add('show');el.innerHTML=hits.length?hits.map(p=>`<button class="search-hit" type="button" data-id="${p.id}"><span><b>${escapeHtml(p.ko)}</b><small>${escapeHtml(p.en)}</small></span><span class="search-hit-routes">${p.routes.map(r=>`<i class="mini-route ${r}"></i>`).join('')}</span></button>`).join(''):'<div style="padding:12px;font-size:10px;color:#777">검색 결과가 없습니다.</div>';el.querySelectorAll('button').forEach(b=>b.onclick=()=>{togglePoi(b.dataset.id);document.getElementById('poiSearch').value='';renderSearch('')})}
  const input=document.getElementById('poiSearch');input.addEventListener('input',e=>renderSearch(e.target.value));input.addEventListener('keydown',e=>{if(e.key==='Enter'){const hit=searchMatches(input.value)[0];if(hit){e.preventDefault();togglePoi(hit.id);input.value='';renderSearch('')}}});document.getElementById('clearPoi').onclick=()=>{selectedPoi.clear();input.value='';renderSearch('');renderPlanner();showRelevantRoutes()};document.addEventListener('click',e=>{if(!e.target.closest('.trip-search'))renderSearch('')});document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{poiLayer.clearLayers()}));renderPlanner();showRelevantRoutes();
})();
</script>
'''
if 'id="hk-trip-planner"' not in s:
    s = s.replace('</body>', planner_js + '\n</body>', 1)

p.write_text(s)
