// Hop-on hop-off bus simulator: pick places → best boarding/alighting stops and order → animated bus on the map.
// Data: window.SIM_DATA[city] from simulator-data.js (built by scripts/simulator/build.mjs).
(()=>{
  const D=window.SIM_DATA||{}, key=document.body.dataset.city, C=D[key];
  if(!C||typeof L==='undefined'){const r=document.getElementById('result');if(r)r.innerHTML='<p class="empty">도시 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p>';return}
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

  // ---------- graph: nodes = stops, edges = bus hops (loop) + short walking transfers ----------
  const nodes=[];const adj=[];
  routeKeys.forEach(rk=>{C.routes[rk].stops.forEach((s,i)=>{nodes.push({id:nodes.length,rk,idx:i,stop:s});adj.push([])})});
  routeKeys.forEach(rk=>{
    const r=C.routes[rk], ns=nodes.filter(n=>n.rk===rk);
    if(ns.length<2)return;
    const segs=ns.map((n,i)=>{const m=ns[(i+1)%ns.length];return hav(n.stop,m.stop)});
    const est=segs.map(d=>d/1000/14*60+1.5), sum=est.reduce((a,b)=>a+b,0);
    let f=r.loopMin?r.loopMin/sum:1; f=Math.min(2.5,Math.max(.6,f));
    ns.forEach((n,i)=>{const m=ns[(i+1)%ns.length];adj[n.id].push({to:m.id,min:est[i]*f,type:'bus',rk,dist:segs[i]})});
  });
  nodes.forEach(a=>nodes.forEach(b=>{if(a.rk===b.rk||a.id===b.id)return;const d=hav(a.stop,b.stop);if(d<=320)adj[a.id].push({to:b.id,min:walkMin(d)+C.routes[b.rk].headway/2+2,type:'transfer',dist:d})}));
  // city-specific links between routes that do not touch (e.g. Hong Kong Star Ferry), both directions
  (C.links||[]).forEach(l=>{const a=nodes.find(n=>n.rk===l.from[0]&&n.stop.n===l.from[1]),b=nodes.find(n=>n.rk===l.to[0]&&n.stop.n===l.to[1]);if(!a||!b)return;
    const near=x=>nodes.filter(n=>hav(n.stop,x.stop)<=60); // every route stopping at that spot gets the link
    near(a).forEach(x=>near(b).forEach(y=>[[x,y],[y,x]].forEach(([f,t])=>adj[f.id].push({to:t.id,min:l.min+C.routes[t.rk].headway/2,type:'link',dist:hav(f.stop,t.stop),icon:l.icon,label:l.label}))))});
  const TRANSIT_KMH=18;
  const transitLeg=d=>({type:'transit',dist:d,min:10+d/1000/TRANSIT_KMH*60,total:10+d/1000/TRANSIT_KMH*60,busMin:0,walkDist:0,rides:[]});

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
    const sources=origin.node!=null?[{id:origin.node,cost:C.routes[nodes[origin.node].rk].headway/2,walk:0}]:nearNodes(origin).map(x=>({id:x.n.id,cost:walkMin(x.d)+C.routes[x.n.rk].headway/2,walk:x.d}));
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
    edges.forEach(e=>{if(e.type==='bus'){const last=rides[rides.length-1];if(last&&last.rk===e.rk&&last.to===e.from){last.to=e.to;last.path.push(e.to);last.min+=e.min}else rides.push({type:'ride',rk:e.rk,from:e.from,to:e.to,path:[e.from,e.to],min:e.min});busMin+=e.min}else if(e.type==='link'){rides.push({type:'link',from:e.from,to:e.to,dist:e.dist,min:e.min-C.routes[nodes[e.to].rk].headway/2,icon:e.icon,label:e.label})}else{rides.push({type:'transfer',from:e.from,to:e.to,dist:e.dist,min:walkMin(e.dist)});walkDist+=e.dist}});
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

  // ---------- map ----------
  const map=L.map('map',{zoomControl:true,scrollWheelZoom:false}).setView(C.center,C.zoom||12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const baseLayer=L.layerGroup().addTo(map), planLayer=L.layerGroup().addTo(map), placeLayer=L.layerGroup().addTo(map), busLayer=L.layerGroup().addTo(map);
  const stopIcon=(rk,n,cls='')=>L.divIcon({className:'sim-stop'+(cls?' '+cls:''),html:`<div style="background:${rColor(rk)}">${n}</div>`,iconSize:[22,22],iconAnchor:[11,11]});
  routeKeys.forEach(rk=>{const r=C.routes[rk],pts=r.stops.map(s=>[s.lat,s.lng]);if(pts.length>1)L.polyline([...pts,pts[0]],{color:r.color,weight:4,opacity:.28}).addTo(baseLayer);r.stops.forEach(s=>L.marker([s.lat,s.lng],{icon:stopIcon(rk,s.n,'dim'),interactive:true}).addTo(baseLayer).bindTooltip(`${s.ko} · ${r.ko}`,{direction:'top',offset:[0,-10],className:'sim-tip'}))});
  map.fitBounds(C.bounds,{padding:[20,20]});
  const starIcon=L.divIcon({className:'',html:'<div class="sim-star">★</div>',iconSize:[28,28],iconAnchor:[14,14]});
  function drawPlaces(){placeLayer.clearLayers();chosen.forEach((p,i)=>{L.marker([p.lat,p.lng],{icon:starIcon}).addTo(placeLayer).bindTooltip(`${i+1}. ${p.ko}`,{permanent:true,direction:'top',offset:[0,-14],className:'sim-label'})});if(chosen.length&&!plan)map.fitBounds(chosen.map(p=>[p.lat,p.lng]),{padding:[60,60],maxZoom:14})}

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
          const wait=C.routes[r.rk].headway/2;const bs=stopOf(r.from);
          const last=toMin(bs.last);if(last!=null&&t>last)warnings.push(`${hhmm(t)} ${bs.ko} 탑승 예정인데 이 정류장 마지막 버스는 ${bs.last}입니다. 출발을 앞당기거나 장소를 줄여보세요.`);
          steps.push({type:'board',t,rk:r.rk,node:r.from,title:`${bs.ko}에서 ${rName(r.rk)} 탑승`,detail:`배차 약 ${C.routes[r.rk].headway}분 · 평균 대기 ${fmtMin(wait)}`,lat:bs.lat,lng:bs.lng});t+=wait;
          const n=r.path.length-1;steps.push({type:'ride',t,min:r.min,rk:r.rk,path:r.path.map(id=>[stopOf(id).lat,stopOf(id).lng]),nodes:r.path,title:`${rName(r.rk)} ${n}정거장 이동`,detail:`약 ${fmtMin(r.min)} · ${r.path.slice(1).map(id=>stopOf(id).ko).join(' → ')}`});t+=r.min;busMin+=r.min;rides++;usedRoutes.add(r.rk);
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
      <div class="actions"><button type="button" class="pri" id="playFromResult">▶ 지도에서 재생</button><button type="button" id="share">링크 복사</button></div></div>
      <ol class="timeline">${p.steps.map((s,i)=>`<li class="st ${s.type}" data-i="${i}"><span class="tm">${hhmm(s.t)}</span><span class="ic">${icon(s)}</span><span class="tx"><b>${s.rk?`<i class="dot" style="background:${rColor(s.rk)}"></i>`:''}${esc(s.title)}</b>${s.detail?`<small>${esc(s.detail)}</small>`:''}${s.type==='alight'&&s.target?`<em>여기서 내리세요 → ${esc(s.target)}</em>`:''}</span></li>`).join('')}</ol>
      ${tk.pick?`<div class="ticket"><div class="kicker">이 코스에 맞는 티켓</div><div class="tk-main"><b>${esc(tk.pick.name)}</b><span>${esc(tk.pick.validity)} · ${esc(tk.pick.price)}</span></div><p>${esc(tk.why)}</p>${tk.others.length?`<ul>${tk.others.map(t=>`<li>${esc(t.name)} · ${esc(t.validity)} · ${esc(t.price)}</li>`).join('')}</ul>`:''}<a class="cta" href="${esc(C.page.booking.url)}" target="_blank" rel="sponsored nofollow noopener">${esc(C.page.booking.label)} →</a><a class="more" href="${esc(C.page.url)}">${esc(C.ko)} ${esc(C.brand)} 가격·노선 총정리 보기</a></div>`:''}
      <p class="note">시간은 정류장 간 거리·공식 한 바퀴 소요 시간·배차 간격으로 계산한 추정치입니다. 도보 거리는 직선거리에 1.25배를 적용했으며 실제 길은 더 길 수 있습니다.</p>`;
    $$('.st').forEach(li=>li.onclick=()=>{const s=p.steps[+li.dataset.i];focusStep(s);$$('.st').forEach(x=>x.classList.remove('on'));li.classList.add('on')});
    $('#playFromResult').onclick=()=>{$('#map').scrollIntoView({behavior:'smooth',block:'center'});play()};
    $('#share').onclick=()=>{const url=location.origin+location.pathname+'#'+encodeState();navigator.clipboard?.writeText(url).then(()=>{$('#share').textContent='복사됨 ✓';setTimeout(()=>$('#share').textContent='링크 복사',1800)}).catch(()=>prompt('이 링크를 복사하세요',url))};
  }
  function focusStep(s){if(s.path)map.fitBounds(s.path,{padding:[50,50],maxZoom:15});else if(s.from)map.fitBounds([s.from,s.to],{padding:[60,60],maxZoom:16});else if(s.lat!=null)map.flyTo([s.lat,s.lng],15,{duration:.5})}
  function drawPlan(p){
    planLayer.clearLayers();busLayer.clearLayers();
    p.steps.forEach(s=>{
      if(s.type==='ride')L.polyline(s.path,{color:rColor(s.rk),weight:7,opacity:.95}).addTo(planLayer);
      if(s.type==='walk')L.polyline([s.from,s.to],{color:'#1d1d1f',weight:3,opacity:.7,dashArray:'5,7'}).addTo(planLayer);
      if(s.type==='transit'||s.type==='link')L.polyline([s.from,s.to],{color:'#6e6e73',weight:3,opacity:.8,dashArray:'2,8'}).addTo(planLayer);
      if(s.type==='board'){const st=nodes[s.node].stop;L.marker([st.lat,st.lng],{icon:stopIcon(s.rk,st.n,'use'),zIndexOffset:400}).addTo(planLayer).bindTooltip(`탑승 · ${st.ko}`,{direction:'top',offset:[0,-10],className:'sim-tip'})}
      if(s.type==='alight'){const st=nodes[s.node].stop;L.marker([st.lat,st.lng],{icon:L.divIcon({className:'',html:`<div class="sim-off" style="border-color:${rColor(s.rk)}"><span>하차</span>${st.n}</div>`,iconSize:[34,34],iconAnchor:[17,17]}),zIndexOffset:600}).addTo(planLayer).bindTooltip(`${hhmm(s.t)} ${st.ko}에서 하차${s.target?` → ${s.target}`:''}`,{direction:'top',offset:[0,-16],className:'sim-tip strong'})}
    });
    const pts=p.steps.filter(s=>s.lat!=null).map(s=>[s.lat,s.lng]).concat(p.steps.filter(s=>s.path).flatMap(s=>s.path));
    if(pts.length)map.fitBounds(pts,{padding:[50,50],maxZoom:15});
  }
  function clearPlan(){planLayer.clearLayers();busLayer.clearLayers();stopAnim();$('#player').hidden=true;$('#result').innerHTML='<div class="empty"><h2>어디 가고 싶으세요?</h2><p>장소를 고르고 ‘코스 만들기’를 누르면 여기에 탑승·하차 순서가 나옵니다.</p></div>'}

  // ---------- animation ----------
  let anim=null,speed=1,frames=[],fi=0,ft=0,busMarker=null,playing=false;
  const busIcon=(mode,rk)=>L.divIcon({className:'',html:`<div class="sim-bus ${mode}" style="background:${rk?rColor(rk):'#1d1d1f'}">${mode==='walk'?'🚶':'🚌'}</div>`,iconSize:[36,36],iconAnchor:[18,18]});
  function buildFrames(p){
    const f=[];
    p.steps.forEach((s,i)=>{
      if(s.type==='walk'||s.type==='transit'||s.type==='link')f.push({i,mode:'walk',pts:[s.from,s.to],dur:Math.max(700,Math.min(2200,s.dist*1.2)),label:`${icon(s)} ${s.title} · ${s.detail}`});
      else if(s.type==='ride'){for(let k=0;k<s.path.length-1;k++)f.push({i,mode:'bus',rk:s.rk,pts:[s.path[k],s.path[k+1]],dur:1100,label:`🚌 ${rName(s.rk)} 탑승 중 · 다음: ${nodes[s.nodes[k+1]].stop.ko}${k+1===s.path.length-1?' (여기서 하차)':` (${s.path.length-2-k}정거장 뒤 하차)`}`})}
      else if(s.type==='board')f.push({i,mode:'bus',rk:s.rk,pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:900,label:`🚌 ${s.title} · ${s.detail}`});
      else if(s.type==='alight')f.push({i,mode:'walk',pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:1500,label:`🔔 ${hhmm(s.t)} ${s.title}${s.target?` → ${s.detail}`:''}`,pulse:true});
      else if(s.type==='visit')f.push({i,mode:'walk',pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:1300,label:`📍 ${s.title} (${s.detail})`});
      else if(s.type==='start'||s.type==='end')f.push({i,mode:'walk',pts:[[s.lat,s.lng],[s.lat,s.lng]],dur:800,label:`${icon(s)} ${hhmm(s.t)} ${s.title}`});
    });
    return f;
  }
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  function tick(now){
    if(!playing)return;
    const fr=frames[fi];if(!fr){playing=false;$('#play').textContent='▶ 다시 재생';$('#now').textContent='🏁 코스 재생이 끝났습니다.';return}
    if(!ft){ft=now;busMarker.setIcon(busIcon(fr.mode,fr.rk));$('#now').textContent=fr.label;$$('.st').forEach(x=>x.classList.toggle('on',+x.dataset.i===fr.i));if(fr.pulse)busMarker.getElement()?.classList.add('pulse');else busMarker.getElement()?.classList.remove('pulse')}
    const prog=Math.min(1,(now-ft)/(fr.dur/speed));const pos=lerp(fr.pts[0],fr.pts[1],prog);busMarker.setLatLng(pos);
    if(!map.getBounds().pad(-.15).contains(pos))map.panTo(pos,{animate:true,duration:.4});
    if(prog>=1){fi++;ft=0}
    anim=requestAnimationFrame(tick);
  }
  function play(){if(!plan)return;$('#player').hidden=false;if(playing){playing=false;cancelAnimationFrame(anim);$('#play').textContent='▶ 재생';return}if(!frames.length||fi>=frames.length){frames=buildFrames(plan);fi=0;ft=0;busLayer.clearLayers();busMarker=L.marker(frames[0].pts[0],{icon:busIcon('walk'),zIndexOffset:1000}).addTo(busLayer);map.setView(frames[0].pts[0],Math.max(map.getZoom(),14),{animate:true})}playing=true;$('#play').textContent='⏸ 일시정지';anim=requestAnimationFrame(tick)}
  function stopAnim(){playing=false;if(anim)cancelAnimationFrame(anim);frames=[];fi=0;ft=0;$('#play').textContent='▶ 재생';$('#now').textContent=''}
  $('#play').onclick=play;$('#reset').onclick=()=>{stopAnim();busLayer.clearLayers();if(plan)drawPlan(plan);$$('.st').forEach(x=>x.classList.remove('on'))};
  $$('.speed button').forEach(b=>b.onclick=()=>{speed=+b.dataset.speed;$$('.speed button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});

  // ---------- go / share ----------
  $('#go').onclick=()=>{if(!chosen.length){$('#placeStatus').textContent='먼저 가고 싶은 곳을 골라주세요.';inp.focus();return}stopAnim();plan=buildPlan();renderPlan(plan);if(plan){drawPlan(plan);$('#player').hidden=false;$('#now').textContent='▶ 재생을 누르면 버스가 코스를 따라 움직입니다.';if(window.innerWidth<=900)$('#result').scrollIntoView({behavior:'smooth',block:'start'})}};
  function encodeState(){return 's='+encodeURIComponent($('#startSel').value)+'&t='+$('#startTime').value+'&p='+chosen.map(c=>c.custom?`c~${c.lat.toFixed(5)}~${c.lng.toFixed(5)}~${c.stay}~${encodeURIComponent(c.ko)}`:`${c.id}~${c.stay}`).join(',')}
  function decodeState(){const h=location.hash.slice(1);if(!h)return false;const q=new URLSearchParams(h);const p=q.get('p');if(!p)return false;p.split(',').forEach(x=>{const a=x.split('~');if(a[0]==='c'){chosen.push({id:'c'+Math.round(+a[1]*1e4)+'_'+Math.round(+a[2]*1e4),ko:decodeURIComponent(a[4]||'내 장소'),en:'',lat:+a[1],lng:+a[2],stay:+a[3]||60,custom:true})}else{const poi=findPoi(a[0]);if(poi)chosen.push({id:poi.id,ko:poi.ko,en:poi.en,lat:poi.lat,lng:poi.lng,stay:+a[1]||60})}});if(q.get('t'))$('#startTime').value=q.get('t');renderQuick();renderChosen();renderStart();if(q.get('s'))$('#startSel').value=q.get('s');drawPlaces();return chosen.length>0}

  window.SIM_DEBUG={legBetween,nodes,adj,nearNodes};
  renderQuick();renderChosen();renderStart();
  if(decodeState())$('#go').click();
})();
