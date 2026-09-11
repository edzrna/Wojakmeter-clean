(() => {
 if(window.__wm3dBridge)return;window.__wm3dBridge=true;
 let frame,stage,wrap,active=false,ready=false,timer;
 const style=document.createElement('style');style.textContent=`
 .wm-3d-toggle{position:relative;z-index:12;margin:8px;padding:7px 12px;border:1px solid #6b9f87;border-radius:20px;background:#101917;color:#e9f8ee;cursor:pointer}
 #heroStage.wm-3d-active #heroFaceWrap{animation:none!important;transform:none!important;background:none!important;scale:1!important;rotate:0deg!important;translate:none!important;filter:none!important}
 #heroStage.wm-3d-active #heroFaceWrap> :not(#wm3dFrame){visibility:hidden!important}
 #wm3dFrame{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:4;background:transparent}
 `;document.head.append(style);
 function send(){
  if(!ready||!frame?.contentWindow)return;
  const css=getComputedStyle(stage),payload={};
  for(const k of ['valence','arousal','tension','fatigue']){
   const value=parseFloat(css.getPropertyValue('--wm-'+k));if(Number.isFinite(value))payload[k]=value;
  }
  frame.contentWindow.postMessage({type:'wm-market',payload},location.origin);
  frame.contentWindow.postMessage({type:'wm-active',active:active&&!document.hidden&&stage.getBoundingClientRect().height>0},location.origin);
 }
 function mount(){
  stage=document.getElementById('heroStage');wrap=document.getElementById('heroFaceWrap');if(!stage||!wrap)return false;
  const button=document.createElement('button');button.type='button';button.className='wm-3d-toggle';button.textContent='Probar personaje 3D';button.setAttribute('aria-pressed','false');stage.before(button);
  button.onclick=()=>{
   active=!active;stage.classList.toggle('wm-3d-active',active);button.setAttribute('aria-pressed',String(active));button.textContent=active?'Volver al personaje original':'Probar personaje 3D';
   if(active&&!frame){frame=document.createElement('iframe');frame.id='wm3dFrame';frame.title='WojakMeter · personaje 3D';frame.src='/wojak-3d/viewer.html?v=8';frame.setAttribute('sandbox','allow-scripts allow-same-origin');wrap.append(frame);}
   if(frame)frame.hidden=!active;send();
  };
  addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='wm-ready'){ready=true;send();}});
  timer=setInterval(send,100);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  document.addEventListener('visibilitychange',send);return true;
 }
 if(!mount()){let attempts=0;const retry=setInterval(()=>{if(mount()||++attempts>100)clearInterval(retry);},100);}
})();
