/* Workspace navigation, observable connectivity, and keyboard access. */
(()=>{
 const app=document.querySelector('.pro-app');
 const map={market:'overview','top-coins':'markets',bagMoodSection:'bag',emotionRadarSection:'radar',moodSection:'token','wojak-studio':'studio',emotionScale:'scale',emotionRush:'play',play:'play',faq:'about','what-is-wojakmeter':'about'};
 let lastGood=0; const failed=new Set();
 const status=document.getElementById('proConnection');const retry=document.getElementById('proRetry');
 function report(){const box=status.parentElement;if(failed.size){box.dataset.state='error';status.textContent=lastGood?'Some feeds are unavailable · showing last received data':'Market feed unavailable · retry to reconnect';retry.hidden=false;}else if(lastGood){box.dataset.state='live';status.textContent='Market data received · '+new Date(lastGood).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});retry.hidden=true;}}
 const native=window.fetch.bind(window);
 window.fetch=async(input,opts={})=>{
  const u=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const critical=/\/api\/(global|top-coins|index-score)(\?|$)/.test(u);
  const key=u.split('?')[0];
  try{const r=await native(input,{...opts,signal:opts.signal||AbortSignal.timeout(20000)});if(critical){if(r.ok){const payload=await r.clone().json().catch(()=>null);if(!payload||payload.ok===false||payload.stale===true){failed.add(key);}else{lastGood=Date.now();failed.delete(key);}}else failed.add(key);report();}return r;}
  catch(e){if(critical){failed.add(key);report()}throw e;}
 };
 retry.addEventListener('click',()=>location.reload());
 function route(){const id=decodeURIComponent(location.hash.slice(1));const view=map[id]||'overview';app.dataset.view=view;app.dataset.menu='closed';document.getElementById('wmMenuToggle')?.setAttribute('aria-expanded','false');document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});window.dispatchEvent(new CustomEvent('wm:view',{detail:{view}}));window.dispatchEvent(new Event('resize'));}
 window.addEventListener('hashchange',route);route();
 document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a){if(a.hash===location.hash)route();window.setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),0);}if(e.target.closest('#wmMenuToggle')){e.stopImmediatePropagation();const open=app.dataset.menu!=='open';app.dataset.menu=open?'open':'closed';document.getElementById('wmMenuToggle').setAttribute('aria-expanded',String(open));}else if(app.dataset.menu==='open'&&!e.target.closest('.pro-sidebar'))app.dataset.menu='closed';},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){app.dataset.menu='closed';document.getElementById('wmMenuToggle')?.setAttribute('aria-expanded','false')}if(e.target.id==='pulseToggle'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click()}});
 // Dynamic market cards were mouse-only in the source version.
 const observer=new MutationObserver(()=>{document.querySelectorAll('.coin-card:not([tabindex])').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','View '+el.textContent.trim().replace(/\s+/g,' '));});});observer.observe(document.querySelector('.dashboard'),{childList:true,subtree:true});
 document.addEventListener('keydown',e=>{if(e.target.matches('.coin-card')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});
})();
