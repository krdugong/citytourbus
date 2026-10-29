// Hop-on hop-off bus simulator: pick places → best boarding/alighting stops and order → 3D bus driving real roads (bird's-eye / top view).
// Data: window.SIM_DATA[city] (simulator-data.js) and window.SIM_GEO (road geometry per stop segment, inlined in the page); both built by scripts/simulator/build.mjs.
(()=>{
  const D=window.SIM_DATA||{}, key=document.body.dataset.city, C=D[key], G=window.SIM_GEO||{};
  if(!C||typeof maplibregl==='undefined'){const r=document.getElementById('result');if(r)r.innerHTML='<p class="empty">도시 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p>';return}
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const routeKeys=Object.keys(C.routes);
  const rName=rk=>C.routes[rk].ko, rColor=rk=>C.routes[rk].color;

  // ---------- geometry ----------
  const rad=x=>x*Math.PI/180;
  const hav=(a,b)=>{const dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),v=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*6371000*Math.asin(Math.sqrt(v))};
  const fmtDist=m=>m<1000?`${Math.round(m/10)*10}m`:`${(m/1000).toFixed(1)}km`;
  const WALK_FACTOR=1.25, WALK_MPM=72; // straight-line detour factor, metres per minute
  const walkMin=m=>m*WALK_FACTOR/WALK_MPM;
  const fmtMin=m=>{m=Math.round(m);return m>=60?`${Math.floor(m/60)}시간 ${m%60?m%60+'분':''}`.trim():`${m}분`};
  const hhmm=t=>{t=((Math.round(t)%1440)+1440)%1440;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`};
  const toMin=s=>{const m=String(s||'').match(/(\d{1,2}):(\d{2})/);return m?+m[1]*60+ +m[2]:null};

  // road geometry for stop i → i+1 of a route (OSRM, fetched at build time); straight line when missing
  const segGeo=(rk,i)=>{const g=G[rk]?.[i];return g&&g.c&&g.c.length>1?g:null};

  // ---------- graph: nodes = stops, edges = bus hops (loop) + short walking transfers ----------
  const waitFor=rk=>Math.min(C.routes[rk].headway/2,20); // tour buses run to a timetable, so riders line up with it
  const nodes=[];const adj=[];
  routeKeys.forEach(rk=>{C.routes[rk].stops.forEach((s,i)=>{nodes.push({id:nodes.length,rk,idx:i,stop:s});adj.push([])})});
  routeKeys.forEach(rk=>{
    const r=C.routes[rk], ns=nodes.filter(n=>n.rk===rk);
    if(ns.length<2)return;
    const segs=ns.map((n,i)=>{const m=ns[(i+1)%ns.length];const g=segGeo(rk,i);return g&&g.d?g.d:hav(n.stop,m.stop)*1.25});
    const est=segs.map(d=>d/1000/14*60+1.5), sum=est.reduce((a,b)=>a+b,0);
    let f=r.loopMin?r.loopMin/sum:1; f=Math.min(2.5,Math.max(.6,f));
    ns.forEach((n,i)=>{const m=ns[(i+1)%ns.length];adj[n.id].push({to:m.id,min:est[i]*f,type:'bus',rk,dist:segs[i]})});
  });
  nodes.forEach(a=>nodes.forEach(b=>{if(a.rk===b.rk||a.id===b.id)return;const d=hav(a.stop,b.stop);if(d<=320)adj[a.id].push({to:b.id,min:walkMin(d)+waitFor(b.rk)+2,type:'transfer',dist:d})}));
  // city-specific links between routes that do not touch (e.g. Hong Kong Star Ferry), both directions
  (C.links||[]).forEach(l=>{const a=nodes.find(n=>n.rk===l.from[0]&&n.stop.n===l.from[1]),b=nodes.find(n=>n.rk===l.to[0]&&n.stop.n===l.to[1]);if(!a||!b)return;
    const near=x=>nodes.filter(n=>hav(n.stop,x.stop)<=60); // every route stopping at that spot gets the link
    near(a).forEach(x=>near(b).forEach(y=>[[x,y],[y,x]].forEach(([f,t])=>adj[f.id].push({to:t.id,min:l.min+waitFor(t.rk),type:'link',dist:hav(f.stop,t.stop),icon:l.icon,label:l.label}))))});
  const TRANSIT_KMH=18,TRANSIT_PENALTY=40; // leaving the tour bus costs extra money/hassle: planning cost only, not shown as time
  const transitLeg=d=>({type:'transit',dist:d,min:10+d/1000/TRANSIT_KMH*60,total:10+d/1000/TRANSIT_KMH*60+TRANSIT_PENALTY,busMin:0,walkDist:0,rides:[]});

  function dijkstra(sources){
    const dist=new Array(nodes.length).fill(Infinity), prev=new Array(nodes.length).fill(null), done=new Array(nodes.length).fill(false);
    sources.forEach(s=>{if(s.cost<dist[s.id]){dist[s.id]=s.cost;prev[s.id]={from:null,edge:null,src:s}}});
    for(;;){let u=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!done[i]&&dist[i]<best){best=dist[i];u=i}if(u<0)break;done[u]=true;
      for(const e of adj[u]){const nd=dist[u]+e.min;if(nd<dist[e.to]){dist[e.to]=nd;prev[e.to]={from:u,edge:e}}}}
    return {dist,prev};
  }
  const nearNodes=(p,max=1500)=>nodes.map(n=>({n,d:hav(p,n.stop)})).filter(x=>x.d<=max).sort((a,b)=>a.d-b.d).slice(0,6);

  // leg from origin {lat,lng,node?} to target place {lat,lng}
  function legBetween(origin,target){
    const direct=hav(origin,target);
    const walkLeg={type:'walk',dist:direct,min:walkMin(direct),total:walkMin(direct),busMin:0,walkDist:direct,rides:[]};
    const sources=origin.node!=null?[{id:origin.node,cost:waitFor(nodes[origin.node].rk),walk:0}]:nearNodes(origin).map(x=>({id:x.n.id,cost:walkMin(x.d)+waitFor(x.n.rk),walk:x.d}));
    const noBus=direct<=1500?walkLeg:transitLeg(direct);
    if(!sources.length)return noBus;
    const {dist,prev}=dijkstra(sources);
    let best=null;
    nearNodes(target).forEach(x=>{const t=dist[x.n.id]+walkMin(x.d);if(isFinite(t)&&(!best||t<best.total))best={node:x.n.id,total:t,walkOff:x.d}});
    if(!best)return noBus;
    // reconstruct
    const edges=[];let cur=best.node;while(prev[cur]&&prev[cur].from!=null){edges.unshift({...prev[cur].edge,from:prev[cur].from});cur=prev[cur].from}
    const src=prev[cur]?.src;
    const rides=[];let walkDist=(src?.walk||0)+best.walkOff,busMin=0;
    edges.forEach(e=>{if(e.type==='bus'){const last=rides[rides.length-1];if(last&&last.rk===e.rk&&last.to===e.from){last.to=e.to;last.path.push(e.to);last.min+=e.min}else rides.push({type:'ride',rk:e.rk,from:e.from,to:e.to,path:[e.from,e.to],min:e.min});busMin+=e.min}else if(e.type==='link'){rides.push({type:'link',from:e.from,to:e.to,dist:e.dist,min:e.min-waitFor(nodes[e.to].rk),icon:e.icon,label:e.label})}else{rides.push({type:'transfer',from:e.from,to:e.to,dist:e.dist,min:walkMin(e.dist)});walkDist+=e.dist}});
    if(!rides.some(r=>r.type==='ride'))return noBus;
    const busLeg={type:'bus',boardNode:cur,alightNode:best.node,walkOn:src?.walk||0,walkOff:best.walkOff,rides,total:best.total,busMin,walkDist};
    if(direct<=900&&walkLeg.total<=busLeg.total)return walkLeg;
    return busLeg;
  }

  // ---------- state ----------
  const chosen=[]; // {id, ko, en, lat, lng, stay, custom}
  let plan=null, startNodeId=null, startPlaceId=null;
  const STAYS=[30,45,60,90,120,180];
  const findPoi=id=>C.pois.find(p=>p.id===id);
  const segLine=(rk,idA,idB)=>{const a=nodes[idA],g=segGeo(rk,a.idx);return g?g.c:[[a.stop.lat,a.stop.lng],[nodes[idB].stop.lat,nodes[idB].stop.lng]]};
  const rideLine=(rk,ids)=>{const out=[];for(let k=0;k<ids.length-1;k++)segLine(rk,ids[k],ids[k+1]).forEach((p,i)=>{if(i===0&&out.length)return;out.push(p)});return out};


  // ---------- map (MapLibre GL: 3D buildings, bird's-eye / top view) ----------
  const STYLE='https://tiles.openfreemap.org/styles/liberty';
  const ll=p=>[p[1],p[0]]; // [lat,lng] → [lng,lat]
  const map=new maplibregl.Map({container:'map',style:STYLE,center:ll(C.center),zoom:C.zoom||12,pitch:0,maxPitch:72,antialias:true,cooperativeGestures:true,attributionControl:{compact:true},
    locale:{'CooperativeGesturesHandler.WindowsHelpText':'Ctrl 키를 누른 채 스크롤하면 확대됩니다','CooperativeGesturesHandler.MacHelpText':'⌘ 키를 누른 채 스크롤하면 확대됩니다','CooperativeGesturesHandler.MobileHelpText':'두 손가락으로 지도를 움직이세요'}});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
  let ready=false;const pend=[];const whenReady=f=>ready?f():pend.push(f);
  let view='bird', follow=true;
  const emptyFC=()=>({type:'FeatureCollection',features:[]});
  const lineF=(coords,props)=>({type:'Feature',properties:props,geometry:{type:'LineString',coordinates:coords.map(ll)}});
  const polyF=(coords,props)=>({type:'Feature',properties:props,geometry:{type:'Polygon',coordinates:[[...coords,coords[0]].map(ll)]}});
  const setData=(id,fc)=>{const s=map.getSource(id);if(s)s.setData(fc)};
  map.once('style.load',()=>{ // style is enough to add our layers; don't wait for every tile
    // Korean labels wherever OpenStreetMap has them
    map.getStyle().layers.forEach(l=>{if(l.type==='symbol'&&l.layout&&l.layout['text-field'])map.setLayoutProperty(l.id,'text-field',['coalesce',['get','name:ko'],['get','name:latin'],['get','name']])});
    if(map.getLayer('building-3d')){map.setPaintProperty('building-3d','fill-extrusion-color','#e6e4df');map.setPaintProperty('building-3d','fill-extrusion-opacity',.92)}
    if(map.setSky)try{map.setSky({'sky-color':'#9ec9f5','horizon-color':'#e8f0fa','fog-color':'#f2f4f7','sky-horizon-blend':.7,'horizon-fog-blend':.5,'fog-ground-blend':.85})}catch(e){}
    map.addSource('base',{type:'geojson',data:{type:'FeatureCollection',features:routeKeys.map(rk=>{const ids=nodes.filter(n=>n.rk===rk).map(n=>n.id);return lineF(ids.length>1?rideLine(rk,[...ids,ids[0]]):[],{color:rColor(rk)})})}});
    map.addLayer({id:'base-line',type:'line',source:'base',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],11,2,16,5],'line-opacity':.35}});
    map.addSource('plan',{type:'geojson',data:emptyFC()});
    map.addLayer({id:'plan-ride-casing',type:'line',source:'plan',filter:['==',['get','kind'],'ride'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],11,5,16,12],'line-opacity':.9}});
    map.addLayer({id:'plan-ride',type:'line',source:'plan',filter:['==',['get','kind'],'ride'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],11,3.5,16,8]}});
    map.addLayer({id:'plan-walk',type:'line',source:'plan',filter:['==',['get','kind'],'walk'],paint:{'line-color':'#1d1d1f','line-width':3,'line-dasharray':[1.5,2],'line-opacity':.75}});
    map.addLayer({id:'plan-other',type:'line',source:'plan',filter:['==',['get','kind'],'other'],paint:{'line-color':'#6e6e73','line-width':3,'line-dasharray':[.5,2.5],'line-opacity':.85}});
    map.addSource('bus',{type:'geojson',data:emptyFC()});
    map.addLayer({id:'bus-shadow',type:'fill',source:'bus',filter:['==',['get','part'],'shadow'],paint:{'fill-color':'#000','fill-opacity':.22}});
    map.addLayer({id:'bus-3d',type:'fill-extrusion',source:'bus',filter:['!=',['get','part'],'shadow'],paint:{'fill-extrusion-color':['get','color'],'fill-extrusion-height':['get','h'],'fill-extrusion-base':['get','b'],'fill-extrusion-opacity':.97}});
    ready=true;pend.splice(0).forEach(f=>f());
    if(!playing)map.easeTo({pitch:view==='bird'?52:0,bearing:view==='bird'?-14:0,duration:1400}); // slow tilt-in on arrival
  });
  map.on('error',e=>{if(e?.error?.message)console.warn('map',e.error.message)});
  map.on('dragstart',()=>{if(playing&&follow){follow=false;$('#follow').hidden=false}});

  // HTML markers (stops, places, boarding/alighting, walker)
  const mk=(html,cls)=>{const el=document.createElement('div');el.className=cls||'';el.innerHTML=html;return el};
  const markers={base:[],plan:[],place:[],bus:[]};
  const clearM=g=>{markers[g].forEach(m=>m.remove());markers[g]=[]};
  const addM=(g,el,p,opt)=>{const m=new maplibregl.Marker({element:el,anchor:'center',...(opt||{})}).setLngLat(ll(p)).addTo(map);markers[g].push(m);return m};
  routeKeys.forEach(rk=>C.routes[rk].stops.forEach(s=>{const el=mk(`<div style="background:${rColor(rk)}">${s.n}</div>`,'sim-stop dim');el.title=`${s.ko} · ${rName(rk)}`;addM('base',el,[s.lat,s.lng])}));
  const boundsOf=pts=>pts.reduce((b,p)=>b.extend(ll(p)),new maplibregl.LngLatBounds(ll(pts[0]),ll(pts[0])));
  function fit(pts,o={}){if(!pts.length)return;whenReady(()=>{const cam=map.cameraForBounds(boundsOf(pts),{padding:o.padding??50,maxZoom:o.maxZoom??15,bearing:0});if(cam)map.easeTo({...cam,pitch:view==='bird'?45:0,bearing:0,duration:o.duration??700})})}
  fit(C.bounds,{padding:20,duration:0});
  function drawPlaces(){clearM('place');chosen.forEach((p,i)=>{const el=mk(`<div class="sim-star">★</div><span class="sim-label">${i+1}. ${esc(p.ko)}</span>`,'sim-place');addM('place',el,[p.lat,p.lng])});if(chosen.length&&!plan)fit(chosen.map(p=>[p.lat,p.lng]),{padding:60,maxZoom:14})}
  function applyView(v,animate=true){view=v;$$('.viewtog [data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));const o=v==='bird'?{pitch:60}:{pitch:0,bearing:0};whenReady(()=>map[animate?'easeTo':'jumpTo']({...o,duration:600}))}
  $$('.viewtog [data-view]').forEach(b=>b.onclick=()=>applyView(b.dataset.view));
  const fsBtn=$('#fs'),wrap=$('.mapwrap');
  if(!(wrap.requestFullscreen||wrap.webkitRequestFullscreen))fsBtn.hidden=true;
  fsBtn.onclick=()=>{if(document.fullscreenElement||document.webkitFullscreenElement)(document.exitFullscreen||document.webkitExitFullscreen).call(document);else (wrap.requestFullscreen||wrap.webkitRequestFullscreen).call(wrap)};
  ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{setTimeout(()=>map.resize(),60);fsBtn.textContent=(document.fullscreenElement||document.webkitFullscreenElement)?'✕ 닫기':'⛶ 전체화면'}));

  // ---------- inputs ----------
  function renderQuick(){$('#quick').innerHTML=C.pois.map(p=>`<button type="button" class="pick ${chosen.some(c=>c.id===p.id)?'on':''}" data-id="${esc(p.id)}">${esc(p.ko)}</button>`).join('');$$('.pick').forEach(b=>b.onclick=()=>togglePoi(b.dataset.id))}
  function togglePoi(id){const i=chosen.findIndex(c=>c.id===id);if(i>=0)chosen.splice(i,1);else{const p=findPoi(id);if(p)chosen.push({id:p.id,ko:p.ko,en:p.en,lat:p.lat,lng:p.lng,stay:60})}afterChange()}
  function addCustom(p){const id='c'+Math.round(p.lat*1e4)+'_'+Math.round(p.lng*1e4);if(!chosen.some(c=>c.id===id))chosen.push({id,ko:p.name,en:p.address||'',lat:p.lat,lng:p.lng,stay:60,custom:true});afterChange()}
  function afterChange(){plan=null;renderQuick();renderChosen();renderStart();drawPlaces();clearPlan()}
  function renderChosen(){
    $('#count').textContent=chosen.length?`${chosen.length}곳`:'';
    $('#chosen').innerHTML=chosen.length?chosen.map((p,i)=>`<li><span class="no">${i+1}</span><span class="nm"><b>${esc(p.ko)}</b>${p.custom?`<small>${esc(p.en.split(',').slice(0,2).join(','))}</small>`:''}</span><select class="stay" data-i="${i}" aria-label="머무는 시간">${STAYS.map(s=>`<option value="${s}" ${s===p.stay?'selected':''}>${s>=60?`${s/60}시간${s%60?' 30분':''}`:s+'분'}</option>`).join('')}</select><button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button></li>`).join(''):'<li class="none">아직 고른 곳이 없습니다. 위에서 눌러 추가하세요.</li>';
    $$('.stay').forEach(s=>s.onchange=()=>{chosen[+s.dataset.i].stay=+s.value;plan=null;clearPlan()});
    $$('.rm').forEach(b=>b.onclick=()=>{chosen.splice(+b.dataset.i,1);afterChange()});
  }
  function renderStart(){
    const sel=$('#startSel'),cur=sel.value;
    sel.innerHTML=(chosen.length?`<optgroup label="내가 고른 장소에서 출발 (호텔 등)">${chosen.map(p=>`<option value="p:${esc(p.id)}">${esc(p.ko)}</option>`).join('')}</optgroup>`:'')+routeKeys.map(rk=>`<optgroup label="${esc(rName(rk))} 정류장">${C.routes[rk].stops.map((s,i)=>`<option value="n:${nodes.find(n=>n.rk===rk&&n.idx===i).id}">${s.n}. ${esc(s.ko)}</option>`).join('')}</optgroup>`).join('');
    const def=`n:${nodes.find(n=>n.rk===C.startStop[0]&&n.stop.n===C.startStop[1])?.id??0}`;
    sel.value=[...sel.options].some(o=>o.value===cur)?cur:def;
  }

  // place search: local POIs instantly, OpenStreetMap on submit
  const sug=$('#suggest'),inp=$('#placeInput');
  const localHits=q=>{q=q.trim().toLowerCase().replace(/\s+/g,'');if(!q)return[];return C.pois.filter(p=>[p.ko,p.en,...(p.aliases||[])].some(x=>String(x||'').toLowerCase().replace(/\s+/g,'').includes(q))).slice(0,6)};
  inp.addEventListener('input',()=>{const h=localHits(inp.value);sug.innerHTML=h.map(p=>`<button type="button" data-id="${esc(p.id)}"><b>${esc(p.ko)}</b><small>${esc(p.en)}</small></button>`).join('');sug.classList.toggle('show',h.length>0);sug.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(!chosen.some(c=>c.id===b.dataset.id))togglePoi(b.dataset.id);inp.value='';sug.classList.remove('show')})});
  document.addEventListener('click',e=>{if(!e.target.closest('.search'))sug.classList.remove('show')});
  $('#placeForm').addEventListener('submit',async e=>{
    e.preventDefault();const q=inp.value.trim(),st=$('#placeStatus'),box=$('#placeResults');sug.classList.remove('show');
    if(q.length<2){st.textContent='장소명을 2글자 이상 입력해 주세요.';return}
    const h=localHits(q);if(h.length===1){togglePoi(h[0].id);inp.value='';st.textContent='';return}
    st.textContent=`${C.ko} 안에서 찾는 중…`;box.innerHTML='';$('#placeBtn').disabled=true;
    try{const res=await fetch(`/api/place-search?city=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(res.status);let items=await res.json();items=Array.isArray(items)?items:[];
      if(!items.length){st.textContent=`검색 결과가 없습니다. 상호명 뒤에 “${C.en}”이나 동네 이름을 붙여보세요.`;return}
      st.textContent='추가할 장소를 고르세요.';
      box.innerHTML=items.slice(0,5).map((x,i)=>`<button type="button" data-i="${i}"><b>${esc(x.name||String(x.display_name||'').split(',')[0])}</b><small>${esc(x.display_name||'')}</small></button>`).join('');
      box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const x=items[+b.dataset.i];addCustom({name:x.name||String(x.display_name||'').split(',')[0],address:x.display_name||'',lat:+x.lat,lng:+x.lon});box.innerHTML='';st.textContent='';inp.value=''});
    }catch(err){st.textContent='장소 검색에 실패했습니다. 잠시 뒤 다시 시도해 주세요.'}
    finally{$('#placeBtn').disabled=false}
  });

  // ---------- planning ----------
  function buildPlan(){
    const sv=$('#startSel').value;
    let origin;
    if(sv.startsWith('p:')){const p=chosen.find(c=>c.id===sv.slice(2));origin={lat:p.lat,lng:p.lng,name:p.ko,placeId:p.id}}
    else{const n=nodes[+sv.slice(2)]||nodes[0];origin={lat:n.stop.lat,lng:n.stop.lng,node:n.id,name:n.stop.ko,rk:n.rk}}
    const targets=chosen.filter(c=>c.id!==origin.placeId);
    if(!targets.length)return null;
    const items=[origin,...targets];
    const cache={};const leg=(i,j)=>{const k=i+':'+j;if(!cache[k])cache[k]=legBetween(i===0?origin:{lat:items[i].lat,lng:items[i].lng},items[j]);return cache[k]};
    const n=targets.length;let order;
    if(n<=7){ // exhaustive
      let best=Infinity;const idx=targets.map((_,i)=>i+1);
      const perm=(arr,m=[])=>{if(!arr.length){let c=0,prev=0;for(const j of m){c+=leg(prev,j).total;if(c>=best)return;prev=j}best=c;order=m.slice();return}for(let i=0;i<arr.length;i++)perm([...arr.slice(0,i),...arr.slice(i+1)],[...m,arr[i]])};
      perm(idx);
    }else{ // nearest neighbour
      const left=targets.map((_,i)=>i+1);order=[];let prev=0;while(left.length){let bi=0,bc=Infinity;left.forEach((j,i)=>{const c=leg(prev,j).total;if(c<bc){bc=c;bi=i}});prev=left[bi];order.push(prev);left.splice(bi,1)}
    }
    // schedule
    const steps=[];let t=toMin($('#startTime').value)??570,prev=0,busMin=0,walkDist=0,rides=0,transfers=0;const usedRoutes=new Set(),warnings=[];
    const stopName=id=>nodes[id].stop.ko, stopOf=id=>nodes[id].stop;
    steps.push({type:'start',t,title:`${origin.name}에서 출발`,lat:origin.lat,lng:origin.lng});
    order.forEach(j=>{
      const tgt=items[j],from=j===order[0]?origin:items[prev],lg=leg(prev,j);
      if(lg.type==='walk'){if(lg.dist>=40)steps.push({type:'walk',t,min:lg.min,dist:lg.dist,title:`${tgt.ko}까지 걸어서 이동`,detail:`약 ${fmtDist(lg.dist)} · ${fmtMin(lg.min)}`,from:[from.lat,from.lng],to:[tgt.lat,tgt.lng]});t+=lg.min;walkDist+=lg.dist}
      else if(lg.type==='transit'){steps.push({type:'transit',t,min:lg.min,dist:lg.dist,title:`${tgt.ko}까지 지하철·택시 등으로 이동`,detail:`${C.brand} 노선이 닿지 않는 구간 · 직선 약 ${fmtDist(lg.dist)} · 약 ${fmtMin(lg.min)}`,from:[from.lat,from.lng],to:[tgt.lat,tgt.lng]});t+=lg.min}
      else{
        const b=nodes[lg.boardNode];
        if(lg.walkOn>=40){steps.push({type:'walk',t,min:walkMin(lg.walkOn),dist:lg.walkOn,title:`${stopName(lg.boardNode)} 정류장까지 도보`,detail:`약 ${fmtDist(lg.walkOn)} · ${fmtMin(walkMin(lg.walkOn))}`,from:[from.lat,from.lng],to:[b.stop.lat,b.stop.lng]});t+=walkMin(lg.walkOn);walkDist+=lg.walkOn}
        lg.rides.forEach((r,ri)=>{
          if(r.type==='transfer'){if(r.dist<40)return;steps.push({type:'walk',t,min:r.min,dist:r.dist,title:`${stopName(r.to)} 정류장으로 환승 이동`,detail:`약 ${fmtDist(r.dist)} · ${fmtMin(r.min)}`,from:[stopOf(r.from).lat,stopOf(r.from).lng],to:[stopOf(r.to).lat,stopOf(r.to).lng]});t+=r.min;walkDist+=r.dist;transfers++;return}
          if(r.type==='link'){steps.push({type:'link',t,min:r.min,dist:r.dist,icon:r.icon,title:`${stopName(r.to)} 정류장으로 이동`,detail:`${r.label} · 약 ${fmtMin(r.min)}`,from:[stopOf(r.from).lat,stopOf(r.from).lng],to:[stopOf(r.to).lat,stopOf(r.to).lng]});t+=r.min;transfers++;return}
          const wait=waitFor(r.rk),hw=C.routes[r.rk].headway;const bs=stopOf(r.from);
          const last=toMin(bs.last);if(last!=null&&t>last)warnings.push(`${hhmm(t)} ${bs.ko} 탑승 예정인데 이 정류장 마지막 버스는 ${bs.last}입니다. 출발을 앞당기거나 장소를 줄여보세요.`);
          steps.push({type:'board',t,rk:r.rk,node:r.from,title:`${bs.ko}에서 ${rName(r.rk)} 탑승`,detail:hw>40?`배차 약 ${hw}분 · 시간표에 맞춰 가면 대기 약 ${fmtMin(wait)}`:`배차 약 ${hw}분 · 평균 대기 ${fmtMin(wait)}`,lat:bs.lat,lng:bs.lng});t+=wait;
          const n=r.path.length-1;steps.push({type:'ride',t,min:r.min,rk:r.rk,path:r.path.map(id=>[stopOf(id).lat,stopOf(id).lng]),line:rideLine(r.rk,r.path),nodes:r.path,title:`${rName(r.rk)} ${n}정거장 이동`,detail:`약 ${fmtMin(r.min)} · ${r.path.slice(1).map(id=>stopOf(id).ko).join(' → ')}`});t+=r.min;busMin+=r.min;rides++;usedRoutes.add(r.rk);
          const as=stopOf(r.to),lastRide=ri===lg.rides.length-1;steps.push({type:'alight',t,rk:r.rk,node:r.to,title:`${as.ko}에서 하차`,detail:lastRide?(lg.walkOff<40?`${tgt.ko}이(가) 정류장 바로 앞입니다`:`${tgt.ko}까지 도보 약 ${fmtDist(lg.walkOff)} (${fmtMin(walkMin(lg.walkOff))})`):'갈아타기 위해 내립니다',lat:as.lat,lng:as.lng,target:lastRide?tgt.ko:null});
        });
        const a=nodes[lg.alightNode];
        if(lg.walkOff>=40){steps.push({type:'walk',t,min:walkMin(lg.walkOff),dist:lg.walkOff,title:`${tgt.ko}까지 도보`,detail:`약 ${fmtDist(lg.walkOff)} · ${fmtMin(walkMin(lg.walkOff))}`,from:[a.stop.lat,a.stop.lng],to:[tgt.lat,tgt.lng]});t+=walkMin(lg.walkOff);walkDist+=lg.walkOff}
      }
      steps.push({type:'visit',t,min:tgt.stay,title:`${tgt.ko} 둘러보기`,detail:`머무는 시간 ${fmtMin(tgt.stay)}`,lat:tgt.lat,lng:tgt.lng});t+=tgt.stay;prev=j;
    });
    steps.push({type:'end',t,title:`코스 종료 · ${items[order[order.length-1]].ko}`,lat:items[order[order.length-1]].lat,lng:items[order[order.length-1]].lng});
    if(t>19*60+30)warnings.push(`예상 종료가 ${hhmm(t)}입니다. 대부분 노선은 저녁 전에 끝나니 마지막 장소는 버스 없이 돌아올 계획을 세우세요.`);
    const start=steps[0].t;
    return {steps,order,origin,start,end:t,busMin,walkDist,rides,transfers,usedRoutes:[...usedRoutes],warnings,places:targets.length};
  }

  // ---------- ticket suggestion ----------
  function ticketAdvice(p){
    const T=C.page.tickets||[];const span=(p.end-p.start)/60;
    const day=T.find(t=>/24|당일|one day|1일/i.test(t.validity+' '+t.name)), two=T.find(t=>/48|2일|2 day/i.test(t.validity+' '+t.name));
    const want48=p.places>=6||span>9||(p.usedRoutes.length>=2&&span>7.5);
    const pick=want48?(two||day):(day||two);
    const why=want48?`장소 ${p.places}곳, 예상 ${fmtMin(p.end-p.start)} 코스라 하루에 다 돌기 빠듯합니다. 이틀로 나누면 48시간권이 편합니다.`:`장소 ${p.places}곳, 예상 ${fmtMin(p.end-p.start)}면 하루에 끝낼 수 있어 24시간권으로 충분합니다.`;
    return {pick,why,others:T.filter(t=>t!==pick).slice(0,3)};
  }

  // ---------- render ----------
  const ICON={start:'🚩',walk:'🚶',board:'🚌',ride:'➡️',alight:'🔔',visit:'📍',end:'🏁',transit:'🚇',link:'🛳'};
  const icon=s=>s.icon||ICON[s.type];
  function renderPlan(p){
    const box=$('#result');if(!p){box.innerHTML='<div class="empty"><h2>장소를 1곳 이상 골라주세요</h2><p>출발지로 고른 장소는 방문 목록에서 빠집니다.</p></div>';return}
    const combo=p.usedRoutes.length?p.usedRoutes.map(rk=>`<span class="rb" style="background:${rColor(rk)}">${esc(rName(rk))}</span>`).join(' '):'<span class="rb" style="background:#555">도보만</span>';
    const tk=ticketAdvice(p);
    box.innerHTML=`<div class="summary"><div class="kicker">추천 코스</div><h2>${combo} ${p.transfers?`<small>환승 ${p.transfers}회</small>`:p.usedRoutes.length>1?'<small>노선 2개 이용</small>':'<small>환승 없음</small>'}</h2>
      <div class="metrics"><div><span>총 소요</span><b>${fmtMin(p.end-p.start)}</b></div><div><span>버스 탑승</span><b>${p.rides}회 · ${fmtMin(p.busMin)}</b></div><div><span>도보 합계</span><b>${fmtDist(p.walkDist)}</b></div><div><span>예상 종료</span><b>${hhmm(p.end)}</b></div></div>
      ${p.warnings.map(w=>`<div class="warn">⚠ ${esc(w)}</div>`).join('')}
      <div class="actions"><button type="button" class="pri" id="playFromResult">▶ 3D로 재생</button><button type="button" id="share">링크 복사</button></div></div>
      <ol class="timeline">${p.steps.map((s,i)=>`<li class="st ${s.type}" data-i="${i}"><span class="tm">${hhmm(s.t)}</span><span class="ic">${icon(s)}</span><span class="tx"><b>${s.rk?`<i class="dot" style="background:${rColor(s.rk)}"></i>`:''}${esc(s.title)}</b>${s.detail?`<small>${esc(s.detail)}</small>`:''}${s.type==='alight'&&s.target?`<em>여기서 내리세요 → ${esc(s.target)}</em>`:''}</span></li>`).join('')}</ol>
      ${tk.pick?`<div class="ticket"><div class="kicker">이 코스에 맞는 티켓</div><div class="tk-main"><b>${esc(tk.pick.name)}</b><span>${esc(tk.pick.validity)} · ${esc(tk.pick.price)}</span></div><p>${esc(tk.why)}</p>${tk.others.length?`<ul>${tk.others.map(t=>`<li>${esc(t.name)} · ${esc(t.validity)} · ${esc(t.price)}</li>`).join('')}</ul>`:''}<a class="cta" href="${esc(C.page.booking.url)}" target="_blank" rel="${C.page.affiliate===false?'nofollow noopener':'sponsored nofollow noopener'}">${esc(C.page.booking.label)} →</a><a class="more" href="${esc(C.page.url)}">${esc(C.ko)} ${esc(C.brand)} 가격·노선 총정리 보기</a></div>`:''}
      <p class="note">시간은 정류장 간 도로 거리·공식 한 바퀴 소요 시간·배차 간격으로 계산한 추정치입니다. 도보 거리는 직선거리에 1.25배를 적용했으며 실제 길은 더 길 수 있습니다.</p>`;
    $$('.st').forEach(li=>li.onclick=()=>{const s=p.steps[+li.dataset.i];focusStep(s);$$('.st').forEach(x=>x.classList.remove('on'));li.classList.add('on')});
    $('#playFromResult').onclick=()=>{$('#map').scrollIntoView({behavior:'smooth',block:'center'});play()};
    $('#share').onclick=()=>{const url=location.origin+location.pathname+'#'+encodeState();navigator.clipboard?.writeText(url).then(()=>{$('#share').textContent='복사됨 ✓';setTimeout(()=>$('#share').textContent='링크 복사',1800)}).catch(()=>prompt('이 링크를 복사하세요',url))};
  }
  function focusStep(s){if(s.line)fit(s.line,{maxZoom:15});else if(s.from)fit([s.from,s.to],{padding:60,maxZoom:16});else if(s.lat!=null)whenReady(()=>map.flyTo({center:ll([s.lat,s.lng]),zoom:15,duration:500}))}
  function drawPlan(p){
    clearM('plan');clearBus();
    const feats=[];
    p.steps.forEach(s=>{
      if(s.type==='ride')feats.push(lineF(s.line,{kind:'ride',color:rColor(s.rk)}));
      if(s.type==='walk')feats.push(lineF([s.from,s.to],{kind:'walk'}));
      if(s.type==='transit'||s.type==='link')feats.push(lineF([s.from,s.to],{kind:'other'}));
      if(s.type==='board'){const st=nodes[s.node].stop;const el=mk(`<div style="background:${rColor(s.rk)}">${st.n}</div>`,'sim-stop use');el.title=`탑승 · ${st.ko}`;addM('plan',el,[st.lat,st.lng])}
      if(s.type==='alight'){const st=nodes[s.node].stop;const el=mk(`<div class="sim-off" style="border-color:${rColor(s.rk)}"><span>하차</span>${st.n}</div><span class="sim-label strong">${hhmm(s.t)} ${esc(st.ko)}${s.target?` → ${esc(s.target)}`:''}</span>`,'sim-place');addM('plan',el,[st.lat,st.lng])}
    });
    whenReady(()=>setData('plan',{type:'FeatureCollection',features:feats}));
    const pts=p.steps.filter(s=>s.lat!=null).map(s=>[s.lat,s.lng]).concat(p.steps.filter(s=>s.line).flatMap(s=>s.line));
    fit(pts,{padding:50,maxZoom:15});
  }
  function clearPlan(){clearM('plan');clearBus();whenReady(()=>setData('plan',emptyFC()));stopAnim();$('#player').hidden=true;$('#result').innerHTML='<div class="empty"><h2>어디 가고 싶으세요?</h2><p>장소를 고르고 ‘코스 만들기’를 누르면 여기에 탑승·하차 순서가 나옵니다.</p></div>'}

  // ---------- animation: 3D bus along real roads, camera follows in bird's-eye view ----------
  let anim=null,speed=1,frames=[],fi=0,ft=0,playing=false,heading=0,camBear=null,lastPos=null,walker=null,pulse=null,startTimer=null;
  function buildFrames(p){
    const f=[];
    p.steps.forEach((s,i)=>{
      if(s.type==='walk'||s.type==='transit'||s.type==='link')f.push({i,mode:'walk',icon:icon(s),pts:[s.from,s.to],dur:Math.max(700,Math.min(2200,s.dist*1.2)),label:`${icon(s)} ${s.title} · ${s.detail}`});
      else if(s.type==='ride'){for(let k=0;k<s.nodes.length-1;k++)f.push({i,mode:'bus',rk:s.rk,pts:segLine(s.rk,s.nodes[k],s.nodes[k+1]),label:`🚌 ${rName(s.rk)} 탑승 중 · 다음: ${nodes[s.nodes[k+1]].stop.ko}${k+1===s.nodes.length-1?' (여기서 하차)':` (${s.nodes.length-2-k}정거장 뒤 하차)`}`})}
      else if(s.type==='board')f.push({i,mode:'bus',rk:s.rk,pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:1100,label:`🚌 ${s.title} · ${s.detail}`});
      else if(s.type==='alight')f.push({i,mode:'bus',rk:s.rk,pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:1600,label:`🔔 ${hhmm(s.t)} ${s.title}${s.target?` → ${s.detail}`:''}`,pulse:true});
      else if(s.type==='visit')f.push({i,mode:'walk',icon:'📍',pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:1300,label:`📍 ${s.title} (${s.detail})`});
      else if(s.type==='start'||s.type==='end')f.push({i,mode:'walk',icon:icon(s),pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:900,label:`${icon(s)} ${hhmm(s.t)} ${s.title}`});
    });
    return f;
  }
  const prep=fr=>{if(fr.cum)return;const c=[0];for(let i=1;i<fr.pts.length;i++)c.push(c[i-1]+hav({lat:fr.pts[i-1][0],lng:fr.pts[i-1][1]},{lat:fr.pts[i][0],lng:fr.pts[i][1]}));fr.cum=c;fr.len=c[c.length-1];if(fr.dur==null)fr.dur=Math.max(900,Math.min(5200,fr.len*1.15))};
  const along=(fr,t)=>{if(!fr.len)return fr.pts[0];const d=t*fr.len;let i=1;while(i<fr.cum.length-1&&fr.cum[i]<d)i++;const a=fr.pts[i-1],b=fr.pts[i],s=Math.max(0,Math.min(1,(d-fr.cum[i-1])/((fr.cum[i]-fr.cum[i-1])||1)));return [a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s]};
  const bearingTo=(a,b)=>{const y=Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0])),x=Math.cos(rad(a[0]))*Math.sin(rad(b[0]))-Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));return (Math.atan2(y,x)*180/Math.PI+360)%360};
  const turn=(from,to,k)=>{const d=((to-from+540)%360)-180;return (from+d*k+360)%360};
  // bus as extruded boxes: body in the route colour, dark windscreen at the front, white roof, soft shadow; grows a little when zoomed out so it stays visible
  function busShapes(pos,hd,color){
    const mpp=156543.03392*Math.cos(rad(pos[0]))/Math.pow(2,map.getZoom());const L=Math.max(12,36*mpp),W=L*.32;
    const sh=Math.sin(rad(hd)),ch=Math.cos(rad(hd)),mLat=111320,mLng=111320*Math.cos(rad(pos[0]));
    const pt=(f,r)=>[pos[0]+(f*ch-r*sh)/mLat,pos[1]+(f*sh+r*ch)/mLng];
    const rect=(f0,f1,w,props)=>polyF([pt(f0,-w),pt(f1,-w),pt(f1,w),pt(f0,w)],props);
    return {type:'FeatureCollection',features:[
      rect(-L/2-.4,L/2+.4,W/2+.5,{part:'shadow',color:'#000',b:0,h:0}),
      rect(-L/2,L/2,W/2,{part:'body',color,b:0,h:L*.3}),
      rect(L/2-L*.17,L/2,W/2*1.01,{part:'front',color:'#23272e',b:L*.08,h:L*.3}),
      rect(-L/2*.88,L/2*.62,W/2*.82,{part:'roof',color:'#ffffff',b:L*.3,h:L*.345}),
    ]};
  }
  function clearBus(){whenReady(()=>setData('bus',emptyFC()));if(walker){walker.remove();walker=null}if(pulse){pulse.remove();pulse=null}}
  function placeBus(pos,fr){
    if(fr.mode==='bus'){if(walker){walker.remove();walker=null}setData('bus',busShapes(pos,heading,rColor(fr.rk)))}
    else{setData('bus',emptyFC());if(!walker)walker=addM('bus',mk(fr.icon||'🚶','sim-walker'),pos);else walker.setLngLat(ll(pos));walker.getElement().textContent=fr.icon||'🚶'}
    if(fr.pulse){if(!pulse)pulse=addM('bus',mk('','sim-pulse'),pos);else pulse.setLngLat(ll(pos))}else if(pulse){pulse.remove();pulse=null}
  }
  function tick(now){
    if(!playing)return;
    const fr=frames[fi];if(!fr){playing=false;$('#play').textContent='▶ 다시 재생';$('#now').textContent='🏁 코스 재생이 끝났습니다. 공유 버튼으로 이 코스를 보내보세요.';return}
    if(!ft){ft=now;prep(fr);$('#now').textContent=fr.label;$$('.st').forEach(x=>x.classList.toggle('on',+x.dataset.i===fr.i))}
    const prog=Math.min(1,(now-ft)/(fr.dur/speed));const pos=along(fr,prog);
    if(lastPos&&hav({lat:lastPos[0],lng:lastPos[1]},{lat:pos[0],lng:pos[1]})>.3)heading=turn(heading,bearingTo(lastPos,pos),.25);
    lastPos=pos;placeBus(pos,fr);
    if(follow){if(view==='bird'){camBear=camBear==null?heading:turn(camBear,heading,.06);map.jumpTo({center:ll(pos),bearing:camBear})}else map.jumpTo({center:ll(pos)})}
    if(prog>=1){fi++;ft=0}
    anim=requestAnimationFrame(tick);
  }
  function play(){
    if(!plan)return;$('#player').hidden=false;
    if(playing){playing=false;cancelAnimationFrame(anim);clearTimeout(startTimer);$('#play').textContent='▶ 재생';return}
    $('#play').textContent='⏸ 일시정지';playing=true;
    if(!frames.length||fi>=frames.length){ // fresh run: fly down to the start, then roll
      frames=buildFrames(plan);fi=0;ft=0;heading=0;camBear=null;lastPos=null;clearBus();follow=true;$('#follow').hidden=true;
      const st=frames[0].pts[0];let started=false;const begin=()=>{if(started||!playing)return;started=true;anim=requestAnimationFrame(tick)};
      whenReady(()=>{map.stop();map.flyTo({center:ll(st),zoom:view==='bird'?16.4:15.7,pitch:view==='bird'?60:0,bearing:view==='bird'?-20:0,duration:1900,essential:true});map.once('moveend',begin);startTimer=setTimeout(begin,2300)});
      return;
    }
    anim=requestAnimationFrame(tick);
  }
  function stopAnim(){playing=false;if(anim)cancelAnimationFrame(anim);clearTimeout(startTimer);frames=[];fi=0;ft=0;$('#play').textContent='▶ 재생';$('#now').textContent=''}
  $('#play').onclick=play;$('#reset').onclick=()=>{stopAnim();clearBus();if(plan)drawPlan(plan);$$('.st').forEach(x=>x.classList.remove('on'))};
  $$('.speed button').forEach(b=>b.onclick=()=>{speed=+b.dataset.speed;$$('.speed button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  $('#follow').onclick=()=>{follow=true;camBear=null;$('#follow').hidden=true};
  const shareUrl=extra=>location.origin+location.pathname+'#'+encodeState()+(extra||'');
  const showLink=url=>{$('#now').innerHTML=`<label style="display:flex;gap:6px;align-items:center">링크 복사 <input readonly value="${esc(url)}" style="flex:1;min-width:0;font-size:11px;padding:4px 6px;border:1px solid var(--line);border-radius:6px" onfocus="this.select()"></label>`;$('#now input')?.select()};
  const copyText=url=>(navigator.clipboard?.writeText(url)||Promise.reject()).then(()=>{$('#shareBtn').textContent='복사됨 ✓';setTimeout(()=>$('#shareBtn').textContent='🔗 공유',1800)}).catch(()=>showLink(url));
  $('#shareBtn').onclick=async()=>{if(!plan)return;const url=shareUrl(`&play=1&v=${view}`);const data={title:`${C.ko} ${C.brand} 하루 코스 3D 시뮬레이션`,text:`${chosen.map(c=>c.ko).join(' → ')} 코스, 3D 지도에서 버스가 달리는 걸 보세요`,url};if(navigator.share&&navigator.canShare?.(data)){try{await navigator.share(data);return}catch(e){if(e?.name==='AbortError')return}}copyText(url)};

  // ---------- go / share ----------
  $('#go').onclick=()=>{if(!chosen.length){$('#placeStatus').textContent='먼저 가고 싶은 곳을 골라주세요.';inp.focus();return}stopAnim();plan=buildPlan();renderPlan(plan);if(plan){drawPlan(plan);$('#player').hidden=false;$('#now').textContent='▶ 재생을 누르면 버스가 실제 도로를 따라 코스를 달립니다.';if(window.innerWidth<=900)$('#result').scrollIntoView({behavior:'smooth',block:'start'})}};
  function encodeState(){return 's='+encodeURIComponent($('#startSel').value)+'&t='+$('#startTime').value+'&p='+chosen.map(c=>c.custom?`c~${c.lat.toFixed(5)}~${c.lng.toFixed(5)}~${c.stay}~${encodeURIComponent(c.ko)}`:`${c.id}~${c.stay}`).join(',')}
  let autoplay=false;
  function decodeState(){const h=location.hash.slice(1);if(!h)return false;const q=new URLSearchParams(h);const p=q.get('p');if(!p)return false;p.split(',').forEach(x=>{const a=x.split('~');if(a[0]==='c'){chosen.push({id:'c'+Math.round(+a[1]*1e4)+'_'+Math.round(+a[2]*1e4),ko:decodeURIComponent(a[4]||'내 장소'),en:'',lat:+a[1],lng:+a[2],stay:+a[3]||60,custom:true})}else{const poi=findPoi(a[0]);if(poi)chosen.push({id:poi.id,ko:poi.ko,en:poi.en,lat:poi.lat,lng:poi.lng,stay:+a[1]||60})}});if(q.get('t'))$('#startTime').value=q.get('t');if(q.get('v')==='top')applyView('top',false);autoplay=q.get('play')==='1';renderQuick();renderChosen();renderStart();if(q.get('s'))$('#startSel').value=q.get('s');drawPlaces();return chosen.length>0}

  window.SIM_DEBUG={legBetween,nodes,adj,nearNodes,map,busShapes,state:()=>({playing,fi,n:frames.length,view,follow,heading})};
  renderQuick();renderChosen();renderStart();
  if(decodeState()){$('#go').click();if(autoplay&&plan)whenReady(()=>setTimeout(()=>{$('#map').scrollIntoView({behavior:'smooth',block:'center'});play()},500))}
})();
