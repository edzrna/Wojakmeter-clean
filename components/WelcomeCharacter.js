import { useEffect, useRef, useState } from 'react';
import { createWelcomeBridge } from '../lib/welcome-character';

export default function WelcomeCharacter({ emotion, axes }) {
  const host=useRef(null), frame=useRef(null), bridge=useRef(null);
  const latest=useRef(axes); latest.current=axes;
  const [state,setState]=useState('loading');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let visible=true,disposed=false;
    const api=createWelcomeBridge({frame:frame.current,origin:window.location.origin,
      onReady:()=>{if(!disposed){clearTimeout(timeout);setState('ready');}},
      onError:()=>{if(!disposed){setState('fallback');api.active(false);}}
    });
    bridge.current=api;
    const message=e=>api.receive(e);
    const visibility=()=>api.active(visible&&!document.hidden);
    window.addEventListener('message',message);
    document.addEventListener('visibilitychange',visibility);
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility();}):null;
    observer?.observe(host.current);
    api.update(latest.current);visibility();
    const timeout=setTimeout(()=>{if(!disposed)setState('fallback');},25000);
    const sync=setInterval(()=>api.sync(),1000);
    return ()=>{disposed=true;clearTimeout(timeout);clearInterval(sync);observer?.disconnect();window.removeEventListener('message',message);document.removeEventListener('visibilitychange',visibility);api.destroy();bridge.current=null;};
  },[attempt]);
  useEffect(()=>{bridge.current?.update(axes);},[axes.arousal,axes.tension,axes.fatigue,axes.valence]);
  return <>
    <div className="lp-character-stage" ref={host} data-render-state={state} aria-busy={state==='loading'}>
      <img id="character" className="lp-character-fallback" src={`/assets/hero/classic/${emotion}.png`} alt={`WojakMeter character expressing ${emotion}`} width="1254" height="1254" fetchPriority="high" aria-hidden={state==='ready'} />
      <iframe key={attempt} ref={frame} className="lp-character-frame" src="/wojak-3d/viewer.html?v=studio-awaken25" title="Interactive WojakMeter 3D emotion preview" sandbox="allow-scripts allow-same-origin" tabIndex={state==='ready'?0:-1} aria-hidden={state!=='ready'} onLoad={()=>bridge.current?.sync()} onError={()=>setState('fallback')} />
    </div>
    {state==='fallback'&&<button type="button" className="lp-3d-retry" onClick={()=>{setState('loading');setAttempt(n=>n+1);}}>Image preview · Retry 3D</button>}
  </>;
}
