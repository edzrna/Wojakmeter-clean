(() => {
 if(window.__wm3dBridge)return;window.__wm3dBridge=true;
 let frame,stage,visible=true,failed=false,timer,modelReady=false,revealed=false,revealTimer;
 let syncKey="",syncToken=0;
 function setState(state){
  stage.dataset.renderState=state;stage.classList.toggle('wm-3d-active',state==='ready'||state==='awakening');
  stage.setAttribute('aria-busy',String(state==='loading'||state==='awakening'));
 }
 function send(){
  if(!frame?.contentWindow)return;
  const css=getComputedStyle(stage),base={};
  for(const k of ['valence','arousal','tension','fatigue']){
   const v=parseFloat(css.getPropertyValue('--wm-'+k));if(Number.isFinite(v))base[k]=v;
  }
  if(Number.isFinite(window.WM_CANONICAL_INDEX))base.marketScore=window.WM_CANONICAL_INDEX;
  const payload=window.WMMarketResponse?window.WMMarketResponse(base,window.WM_MARKET_SNAPSHOT,window.WM_CHARACTER_WINDOW):base;
  const key=stage.dataset.mood||'neutral';
  if(key!==syncKey){syncKey=key;syncToken++;}
  frame.contentWindow.postMessage({type:'wm-market',payload,
   entranceToken:modelReady&&!revealed?syncToken:null},location.origin);
  if(Array.isArray(window.WM_CHARACTER_NEWS))frame.contentWindow.postMessage({type:'wm-news',items:window.WM_CHARACTER_NEWS},location.origin);
  frame.contentWindow.postMessage({type:'wm-active',active:!failed&&visible&&!document.hidden&&stage.getBoundingClientRect().height>0},location.origin);
 }
 function fallback(terminal=false){failed=terminal;clearTimeout(timer);clearTimeout(revealTimer);setState('fallback');send();}
 async function reveal(token){
  if(revealed||failed||token!==syncToken)return;
  const img=document.getElementById('heroFaceImg'),src=img?.currentSrc||img?.src;
  try{if(img?.decode)await img.decode();}catch{}
  if(revealed||failed||token!==syncToken||src!==(img?.currentSrc||img?.src))return;
  revealed=true;clearTimeout(timer);
  setState('awakening');
  frame.contentWindow.postMessage({type:'wm-awaken'},location.origin);
  revealTimer=setTimeout(()=>{if(!failed)setState('ready');},1100);
 }
 function mount(){
  stage=document.getElementById('heroStage');const wrap=document.getElementById('heroFaceWrap');if(!stage||!wrap)return false;
  setState('loading');
  const adapter=document.createElement('script');adapter.src='/wojak-3d/market-response.js?v=living22';adapter.onload=send;document.head.append(adapter);
  frame=document.createElement('iframe');frame.id='wm3dFrame';frame.title='WojakMeter market emotion';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin');
  addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
   if(e.data?.type==='wm-ready'&&!failed){modelReady=true;send();}
   if(e.data?.type==='wm-pose-ready'&&!failed)reveal(e.data.token);
   if(e.data?.type==='wm-error')fallback(true);
  });
  frame.addEventListener('error',()=>fallback(true));
  frame.src='/wojak-3d/viewer.html?v=awaken24';wrap.append(frame);
  timer=setTimeout(()=>fallback(),15000);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;send();}).observe(stage);
  setInterval(send,200);document.addEventListener('visibilitychange',send);addEventListener('pageshow',send);
  return true;
 }
 if(!mount()){let attempts=0;const retry=setInterval(()=>{if(mount()||++attempts>100)clearInterval(retry);},100);}
})();
