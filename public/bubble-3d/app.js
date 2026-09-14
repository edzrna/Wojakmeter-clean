(function(){
'use strict';
const $=id=>document.getElementById(id),root=$('stage');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const colors=['#E4485C','#E8848F','#E8B4BA','#B8C0CB','#A8E6BF','#7FD9A0','#3BD97A'];
const names=['Frustration','Concern','Doubt','Neutral','Optimism','Content','Euphoria'];
const mood=s=>s<20?0:s<35?1:s<45?2:s<60?3:s<70?4:s<85?5:6;
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const money=v=>numeric(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v<1?8:2}).format(v):'Not available';
const compact=v=>numeric(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(v):'Not available';
const percent=v=>numeric(v)?`${v>0?'+':''}${v.toFixed(2)}%`:'Not available';
const generic='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="18" fill="%23293642" stroke="%2397a9b8"/%3E%3Cpath d="M20 9L29 20 20 31 11 20Z" fill="%23b8c0cb"/%3E%3C/svg%3E';
function logo(img,url){let src=generic;try{const u=new URL(url,location.origin);if(u.protocol==='https:'||u.origin===location.origin)src=u.href}catch{}if(img.dataset.url===src)return;img.dataset.url=src;img.onerror=()=>{img.onerror=null;img.src=generic};img.src=src;}
let data=[],bodies=[],selected=null,timeframe='24h',active=true,inView=true,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,scene,camera,ray,pointer,ring,webgl=false;
let yaw=.35,pitch=.19,targetYaw=yaw,targetPitch=pitch,distance=30,zoom=1,elapsed=0,last=0,acc=0;
const bounds={x:6,y:4,z:4};
function send(type,extra={}){parent.postMessage({type,...extra},location.origin)}
function fail(){webgl=false;$('fallback').hidden=false;$('logos').hidden=true;$('empty').hidden=true;$('pause').disabled=true;$('reset').disabled=true;renderList();}
try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;root.prepend(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.1,160);ray=new THREE.Raycaster();pointer=new THREE.Vector2();
 scene.add(new THREE.HemisphereLight(0xc4dcff,0x20212b,2));
 const key=new THREE.DirectionalLight(0xfff1df,3.2);key.position.set(-7,11,9);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:40});key.shadow.bias=-.0006;key.shadow.normalBias=.035;scene.add(key);
 const rim=new THREE.DirectionalLight(0x86b7ff,2.5);rim.position.set(7,4,-7);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,8),new THREE.MeshStandardMaterial({color:0x111c2a,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-4;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(12,12,0x334451,0x1c2c3b);grid.position.y=-3.99;grid.scale.z=2/3;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
 scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(12,8,8)),new THREE.LineBasicMaterial({color:0x688498,transparent:true,opacity:.17})));
 ring=new THREE.Mesh(new THREE.TorusGeometry(1,.02,8,64),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8}));ring.visible=false;scene.add(ring);
 webgl=true;
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail()});
 // Continue with the accessible list after context loss; never leave a blank map.
}catch(e){fail()}
function renderList(){const frag=document.createDocumentFragment();data.forEach(c=>{const b=document.createElement('button'),img=document.createElement('img'),t=document.createElement('span');logo(img,c.image);img.alt='';t.textContent=c.symbol.toUpperCase();b.append(img,t);b.onclick=()=>select(c.id);frag.append(b)});$('list').replaceChildren(frag);}
function select(id){selected=data.find(c=>c.id===id)||null;$('detail').hidden=!selected;$('asset').value=selected?.id||'';if(!selected)return;details();$('close').focus({preventScroll:true});}
function details(){if(!selected)return;const c=selected;logo($('coinLogo'),c.image);$('coinName').textContent=c.name;$('symbol').textContent=c.symbol.toUpperCase();$('price').textContent=money(c.current_price);const known=numeric(c.score),m=mood(c.score);$('reading').textContent=known?`${names[m]} · ${Math.round(c.score)}/100 · ${timeframe}`:`Emotion unavailable · ${timeframe}`;$('reading').style.color=known?colors[m]:colors[3];const entries=[['1h change',percent(c.price_change_percentage_1h_in_currency)],['24h change',percent(c.price_change_percentage_24h_in_currency)],['7d change',percent(c.price_change_percentage_7d_in_currency)],['Market cap',compact(c.market_cap)],['24h volume',compact(c.total_volume)]];const f=document.createDocumentFragment();entries.forEach(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;f.append(dt,dd)});$('metrics').replaceChildren(f);}
function update(payload){
 if(!Array.isArray(payload.coins))return;
 data=payload.coins.filter(c=>c&&typeof c.id==='string'&&typeof c.symbol==='string').filter((c,i,a)=>a.findIndex(v=>v.id===c.id)===i).sort((a,b)=>(b.market_cap||0)-(a.market_cap||0)).slice(0,20);
 timeframe=['1h','24h','7d'].includes(payload.timeframe)?payload.timeframe:'24h';active=payload.active!==false;
 $('empty').hidden=!!data.length;$('empty').textContent=payload.stale?'Market data is unavailable. Retrying automatically…':'Reading market…';
 $('status').textContent=data.length?`${data.length} assets · ${timeframe} sentiment · ${payload.stale?'Refresh unavailable · last received':'Received'} ${payload.updatedAt?new Date(payload.updatedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'—'}`:'Waiting for market data';
 const options=document.createDocumentFragment(),first=document.createElement('option');first.value='';first.textContent='Choose asset';options.append(first);data.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.name} (${c.symbol.toUpperCase()})`;options.append(o)});$('asset').replaceChildren(options);
 if(selected){selected=data.find(c=>c.id===selected.id)||null;$('detail').hidden=!selected;$('asset').value=selected?.id||'';details()}
 if(!webgl){renderList();return}
 const ids=new Set(data.map(c=>c.id));bodies.filter(b=>!ids.has(b.id)).forEach(b=>{scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();b.img.remove()});bodies=bodies.filter(b=>ids.has(b.id));
 const caps=data.map(c=>Math.log10(Math.max(1,c.market_cap||1))),lo=Math.min(...caps),hi=Math.max(...caps);
 data.forEach((c,i)=>{let b=bodies.find(v=>v.id===c.id);if(!b){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),new THREE.MeshPhysicalMaterial({roughness:.33,metalness:.12,clearcoat:.4,clearcoatRoughness:.3}));mesh.castShadow=true;mesh.receiveShadow=true;const img=document.createElement('img');img.className='coin-logo';img.alt='';$('logos').append(img);b={id:c.id,pos:new THREE.Vector3((i%4-1.5)*2.6,(Math.floor(i/4)%3-1)*2.3,(Math.floor(i/12)*2-1)*1.9),vel:new THREE.Vector3(.1*Math.sin(i),0,.1*Math.cos(i)),mesh,img,phase:i*2.399};mesh.userData.body=b;scene.add(mesh);bodies.push(b)}
 b.r=.44+.43*(Math.log10(Math.max(1,c.market_cap||1))-lo)/Math.max(.001,hi-lo);b.score=numeric(c.score)?clamp(c.score,0,100):50;b.mass=(1.65-1.1*b.score/100)*b.r**3;b.equilibrium=-2.75+5.5*b.score/100;
 const change=c[`price_change_percentage_${timeframe}_in_currency`];b.energy=clamp((numeric(change)?Math.abs(change)/15:0)+(c.market_cap>0&&numeric(c.total_volume)?c.total_volume/c.market_cap*.5:0),.08,1);b.mesh.scale.setScalar(b.r);b.mesh.material.color.set(colors[mood(b.score)]);logo(b.img,c.image);
 });resize();
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='wm-bubble-data')update(e.data);if(e.data?.type==='wm-bubble-active'){active=!!e.data.active;last=0;acc=0}});
$('asset').onchange=e=>select(e.target.value);$('close').onclick=()=>{select(null);$('asset').focus()};$('chart').onclick=()=>{if(selected)send('wm-bubble-chart',{id:selected.id})};
function pauseLabel(){$('pause').textContent=paused?'Play':'Pause';$('pause').setAttribute('aria-pressed',String(paused))}pauseLabel();$('pause').onclick=()=>{paused=!paused;pauseLabel()};$('reset').onclick=()=>{targetYaw=.35;targetPitch=.19;zoom=1};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(selected)select(null);else send('wm-bubble-escape')}});
function resize(){if(!webgl)return;const r=root.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();const v=37*Math.PI/180,h=2*Math.atan(Math.tan(v/2)*camera.aspect);distance=8.5/Math.sin(Math.min(v,h)/2)}
new ResizeObserver(resize).observe(root);new IntersectionObserver(es=>{inView=es[0].isIntersecting;last=0}).observe(root);
const touches=new Map();let drag=null,pinch=0;
root.addEventListener('pointerdown',e=>{if(!webgl||e.target.closest('button'))return;root.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,moved:false};if(touches.size>1){drag.moved=true;const a=[...touches.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}});
root.addEventListener('pointermove',e=>{const old=touches.get(e.pointerId);if(!old)return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>1){const a=[...touches.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)zoom=clamp(zoom*pinch/Math.max(1,d),.65,1.4);pinch=d;if(drag)drag.moved=true;return}if(drag&&(drag.moved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)){drag.moved=true;targetYaw-=(e.clientX-old.x)*.007;targetPitch=clamp(targetPitch+(e.clientY-old.y)*.006,-.05,.7)}});
function end(e){if(webgl&&drag&&!drag.moved&&touches.size===1&&e.type==='pointerup'){const r=root.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(bodies.map(b=>b.mesh))[0];select(hit?.object.userData.body.id||null)}touches.delete(e.pointerId);drag=null;pinch=0}root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);root.addEventListener('lostpointercapture',end);root.addEventListener('wheel',e=>{if(!webgl)return;e.preventDefault();zoom=clamp(zoom+e.deltaY*.0005,.65,1.4)},{passive:false});
function step(dt){elapsed+=dt;
 for(const b of bodies){const p=b.phase,s=b.score/100,energy=b.energy,agitation=.15+energy*2.7;
  // Height is a damped equilibrium, not an endless force into ceiling/floor.
  b.vel.x+=(Math.sin(elapsed*(.55+energy)+p)*agitation-.12*b.pos.x)*dt;
  b.vel.z+=(Math.cos(elapsed*(.43+energy*.8)+p*1.8)*agitation-.10*b.pos.z)*dt;
  b.vel.y+=((b.equilibrium-b.pos.y)*1.25+Math.sin(elapsed*(1+energy*3)+p)*energy*2.5)*dt;
  b.vel.multiplyScalar(Math.exp(-(.5+(1-s)*.85)*dt));b.vel.clampLength(0,5.5);b.pos.addScaledVector(b.vel,dt);
 }
 // Sphere collision impulses + positional correction; several passes prevent overlap.
 for(let pass=0;pass<3;pass++){
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j],n=new THREE.Vector3().subVectors(b.pos,a.pos),d=n.length(),limit=a.r+b.r;
   if(d>=limit)continue;if(d<1e-8)n.set(1,0,0);else n.multiplyScalar(1/d);
   const ia=1/a.mass,ib=1/b.mass,total=ia+ib;const penetration=limit-d+.0001;
   a.pos.addScaledVector(n,-penetration*ia/total);b.pos.addScaledVector(n,penetration*ib/total);
   const closing=new THREE.Vector3().subVectors(b.vel,a.vel).dot(n);
   if(closing<0){const restitution=.24+.44*(a.score+b.score)/200;const impulse=-(1+restitution)*closing/total;a.vel.addScaledVector(n,-impulse*ia);b.vel.addScaledVector(n,impulse*ib);}
  }
  for(const b of bodies)for(const axis of ['x','y','z']){const edge=bounds[axis]-b.r;if(b.pos[axis]>edge){b.pos[axis]=edge;if(b.vel[axis]>0)b.vel[axis]*=-.55;}if(b.pos[axis]<-edge){b.pos[axis]=-edge;if(b.vel[axis]<0)b.vel[axis]*=-.55;}}
 }
}
const projected=webgl?new THREE.Vector3():null,direction=webgl?new THREE.Vector3():null,relative=webgl?new THREE.Vector3():null;
function frame(now){requestAnimationFrame(frame);if(!webgl||!active||!inView||document.hidden){last=0;return}const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;if(!paused){acc+=dt;while(acc>=1/120){step(1/120);acc-=1/120}}yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*9));pitch+=(targetPitch-pitch)*(1-Math.exp(-dt*9));camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance*zoom,Math.sin(pitch)*distance*zoom,Math.cos(yaw)*Math.cos(pitch)*distance*zoom);camera.lookAt(0,0,0);camera.updateMatrixWorld();const w=root.clientWidth,h=root.clientHeight;
 for(const b of bodies){b.mesh.position.copy(b.pos);projected.copy(b.pos).project(camera);const dist=camera.position.distanceTo(b.pos);direction.subVectors(b.pos,camera.position).normalize();let occluded=false;
  for(const o of bodies){if(o===b)continue;relative.subVectors(o.pos,camera.position);const along=relative.dot(direction);if(along>0&&along<dist-b.r&&relative.lengthSq()-along*along<o.r*o.r*.85){occluded=true;break}}
  const size=clamp(b.r*h/(dist*Math.tan(37*Math.PI/360))*.66,8,90);b.img.style.width=b.img.style.height=size+'px';b.img.style.transform=`translate(${(projected.x*.5+.5)*w-size/2}px,${(-projected.y*.5+.5)*h-size/2}px)`;b.img.style.zIndex=String(Math.round(1000-dist*10));b.img.hidden=occluded||Math.abs(projected.z)>1;
 }
 const sel=selected&&bodies.find(b=>b.id===selected.id);ring.visible=!!sel;if(sel){ring.position.copy(sel.pos);ring.scale.setScalar(sel.r*1.08);ring.quaternion.copy(camera.quaternion)}renderer.render(scene,camera);
}
resize();requestAnimationFrame(frame);send('wm-bubble-ready');
})();
