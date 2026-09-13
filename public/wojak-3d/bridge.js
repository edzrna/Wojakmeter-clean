(() => {
 if(window.__wm3dBridge)return;window.__wm3dBridge=true;
 let frame,stage,ready=false,visible=true,failed=false,timeout;
 function setState(state){
  stage.dataset.renderState=state;
  stage.classList.toggle('wm-3d-active',state==='ready');
  stage.setAttribute('aria-busy',String(state==='loading'));
 }
 function send(){
  if(!frame?.contentWindow)return;
  const css=getComputedStyle(stage),base={};
  for(const k of ['valence','arousal','tension','fatigue']){
   const v=parseFloat(css.getPropertyValue('--wm-'+k));if(Number.isFinite(v))base[k]=v;
  }
  if(Number.isFinite(window.WM_CANONICAL_INDEX))base.marketScore=window.WM_CANONICAL_INDEX;
  const payload=window.WMMarketResponse?window.WMMarketResponse(base,window.WM_MARKET_SNAPSHOT,window.WM_CHARACTER_WINDOW):base;
  frame.contentWindow.postMessage({type:'wm-market',payload},location.origin);
  frame.contentWindow.postMessage({type:'wm-active',active:!failed&&visible&&!document.hidden&&stage.getBoundingClientRect().height>0},location.origin);
 }
 function fallback(terminal=false){
  failed=terminal;ready=false;clearTimeout(timeout);setState('fallback');send();
 }
 function mount(){
  stage=document.getElementById('heroStage');const wrap=document.getElementById('heroFaceWrap');if(!stage||!wrap)return false;
  setState('loading');
  const adapter=document.createElement('script');adapter.src='/wojak-3d/market-response.js?v=fallback20';adapter.onload=send;document.head.append(adapter);
  frame=document.createElement('iframe');frame.id='wm3dFrame';frame.title='WojakMeter market emotion';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin');
  addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
   if(e.data?.type==='wm-ready'&&!failed){ready=true;clearTimeout(timeout);send();setState('ready');}
   if(e.data?.type==='wm-error')fallback(true);
  });
  frame.addEventListener('error',()=>fallback(true));
  frame.src='/wojak-3d/viewer.html?v=fallback20';wrap.append(frame);
  timeout=setTimeout(()=>fallback(false),15000);
  if('IntersectionObserver' in window){
   const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;send();});observer.observe(stage);
  }
  setInterval(send,200);
  document.addEventListener('visibilitychange',send);
  addEventListener('pageshow',send);
  return true;
 }
 if(!mount()){let n=0;const retry=setInterval(()=>{if(mount()||++n>100)clearInterval(retry);},100);}
})();
