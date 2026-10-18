(()=>{
  const form=document.getElementById('placeFinderForm');
  if(!form||typeof map==='undefined'||typeof routes==='undefined')return;
  const input=document.getElementById('placeSearchInput');
  const status=document.getElementById('placeSearchStatus');
  const results=document.getElementById('placeSearchResults');
  const nearest=document.getElementById('nearestStopResult');
  const submit=form.querySelector('button[type="submit"]');
  const placeLayer=L.layerGroup().addTo(map);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const routeOrder=['red','green','blue'];

  function haversine(a,b){
    const R=6371000,toRad=x=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lng-a.lng);
    const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  }
  function fmtDistance(m){return m<1000?`${Math.round(m/10)*10}m`:`${(m/1000).toFixed(1)}km`}
  function closeness(m){if(m<=350)return '매우 가까운 편';if(m<=700)return '가까운 편';if(m<=1200)return '조금 떨어져 있음';return '정류장에서 거리가 있음'}
  function groupedStops(point){
    const groups=[];
    Object.entries(routes).forEach(([rk,r])=>r.stops.forEach(s=>{
      const key=`${s.lat.toFixed(4)}:${s.lng.toFixed(4)}`;
      let g=groups.find(x=>x.key===key);
      if(!g){g={key,lat:s.lat,lng:s.lng,ko:s.ko,en:s.en,entries:[]};groups.push(g)}
      g.entries.push({route:rk,n:s.n,stop:s});
    }));
    return groups.map(g=>({...g,distance:haversine(point,g)})).sort((a,b)=>a.distance-b.distance);
  }
  function routeLabel(rk){return routes[rk]?.ko||rk}
  function showOnlyRoutes(keys){
    const set=new Set(keys);
    Object.entries(layers).forEach(([rk,l])=>{if(set.has(rk)){if(!map.hasLayer(l))map.addLayer(l)}else if(map.hasLayer(l))map.removeLayer(l)});
    document.querySelectorAll('.filter').forEach(b=>b.setAttribute('aria-pressed',String(keys.length===1&&b.dataset.route===keys[0])));
  }
  function pinIcon(){return L.divIcon({className:'',html:'<div class="place-pin"><span>●</span></div>',iconSize:[32,32],iconAnchor:[10,28]})}
  function plotPlace(place,stops){
    placeLayer.clearLayers();
    const p=[place.lat,place.lng];
    const marker=L.marker(p,{icon:pinIcon()}).addTo(placeLayer);
    marker.bindTooltip(place.name,{permanent:true,direction:'top',offset:[6,-24],className:'place-map-label',opacity:.96});
    stops.slice(0,3).forEach((g,i)=>{
      L.polyline([p,[g.lat,g.lng]],{color:i===0?'#1d1d1f':'#8e8e93',weight:i===0?3:2,opacity:i===0?.75:.45,dashArray:'6,8'}).addTo(placeLayer);
    });
    const pts=[p,...stops.slice(0,3).map(g=>[g.lat,g.lng])];
    map.fitBounds(L.latLngBounds(pts),{padding:[55,55],maxZoom:15});
  }
  function renderNearest(place){
    const groups=groupedStops(place);
    const top=groups.slice(0,3),best=top[0];
    const bestRoutes=[...new Set(best.entries.map(x=>x.route))].sort((a,b)=>routeOrder.indexOf(a)-routeOrder.indexOf(b));
    showOnlyRoutes(bestRoutes);
    plotPlace(place,top);
    nearest.innerHTML=`
      <div class="nearest-card">
        <div class="nearest-place-name">${esc(place.name)}</div>
        <div class="nearest-place-address">${esc(place.address||'홍콩 내 검색 장소')}</div>
        <div class="nearest-answer">
          <div class="nearest-answer-label">가장 가까운 Big Bus 정류장</div>
          <strong>${esc(best.ko)} · 약 ${fmtDistance(best.distance)}</strong>
          <div class="nearest-route-badges">${bestRoutes.map(r=>`<span class="nearest-route-badge ${r}">${esc(routeLabel(r))}</span>`).join('')}</div>
          <div class="placefinder-note">${closeness(best.distance)} · 현재 거리는 좌표 간 직선거리입니다. 실제 도보거리는 도로·횡단보도에 따라 더 길 수 있습니다.</div>
        </div>
        <div class="nearest-list">${top.map((g,i)=>{
          const rs=[...new Set(g.entries.map(x=>x.route))];
          const nums=g.entries.map(x=>`${routeLabel(x.route)} ${x.n}번`).join(' · ');
          return `<button type="button" class="nearest-row" data-lat="${g.lat}" data-lng="${g.lng}" data-route="${g.entries[0].route}" data-stop="${g.entries[0].n}"><span class="nearest-rank">${i+1}</span><span><b>${esc(g.ko)}</b><small>${esc(nums)}</small></span><span class="nearest-distance">${fmtDistance(g.distance)}<small>${closeness(g.distance)}</small></span></button>`
        }).join('')}</div>
      </div>`;
    nearest.querySelectorAll('.nearest-row').forEach(b=>b.onclick=()=>{
      const rk=b.dataset.route,n=+b.dataset.stop;
      if(typeof selectStop==='function')selectStop(rk,n,false);
      map.flyTo([+b.dataset.lat,+b.dataset.lng],16,{duration:.5});
    });
  }
  function renderSearchResults(items){
    results.innerHTML='';
    if(!items.length){status.textContent='검색 결과가 없습니다. 상호명 뒤에 “홍콩” 또는 지역명(센트럴·침사추이 등)을 붙여보세요.';return}
    status.textContent=`${items.length}개 결과 중 장소를 선택하세요.`;
    results.innerHTML=items.map((x,i)=>{
      const name=x.name||x.display_name?.split(',')[0]||'검색 장소';
      const addr=x.display_name||'';
      return `<button type="button" class="place-result" data-i="${i}"><b>${esc(name)}</b><small>${esc(addr)}</small></button>`
    }).join('');
    results.querySelectorAll('.place-result').forEach(b=>b.onclick=()=>{
      const x=items[+b.dataset.i],name=x.name||x.display_name?.split(',')[0]||'검색 장소';
      results.innerHTML='';status.textContent='가까운 정류장을 계산했습니다.';
      renderNearest({name,address:x.display_name||'',lat:+x.lat,lng:+x.lon});
    });
  }
  function localFallback(q){
    if(typeof pois==='undefined'||!Array.isArray(pois))return [];
    const needle=String(q||'').toLowerCase().replace(/\s+/g,'');
    return pois.filter(p=>[p.ko,p.en].some(v=>String(v||'').toLowerCase().replace(/\s+/g,'').includes(needle))).slice(0,5).map(p=>({name:p.ko,display_name:`${p.ko} · Hong Kong`,lat:String(p.lat),lon:String(p.lng)}));
  }

  async function searchPlace(q){
    submit.disabled=true;status.textContent='홍콩 내 장소를 찾는 중입니다…';results.innerHTML='';nearest.innerHTML='';
    try{
      const res=await fetch(`/api/place-search?city=hong-kong&q=${encodeURIComponent(q)}`,{headers:{'Accept':'application/json'}});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      let data=await res.json();data=Array.isArray(data)?data:[];if(!data.length)data=localFallback(q);renderSearchResults(data);
    }catch(e){const fallbackItems=localFallback(q);if(fallbackItems.length){status.textContent='기본 관광지 데이터에서 찾았습니다.';renderSearchResults(fallbackItems)}else{status.textContent='장소 검색에 실패했습니다. 잠시 뒤 다시 시도해 주세요.'}console.warn('place search failed',e)}
    finally{submit.disabled=false}
  }
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(q.length<2){status.textContent='맛집·호텔·관광지 이름을 2글자 이상 입력해 주세요.';return}searchPlace(q)});
})();
