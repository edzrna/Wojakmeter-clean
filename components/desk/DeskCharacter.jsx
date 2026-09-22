import {useEffect,useRef,useState} from 'react';
import {createDeskBridge} from '../../lib/desk/character-bridge';
const AXES={frustration:[-1,.95,.95,.3],concern:[-.65,.65,.8,.25],doubt:[-.3,.4,.5,.35],neutral:[0,.25,.15,.15],optimism:[.4,.5,.2,.1],content:[.7,.55,.1,.05],euphoria:[1,.95,.15,.05]};
export default function DeskCharacter({mood='neutral',active=true}){
 const frame=useRef(null),host=useRef(null),bridge=useRef(null),latest=useRef(null),activity=useRef(active);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const values=AXES[mood]||AXES.neutral;
 latest.current={valence:values[0],arousal:values[1],tension:values[2],fatigue:values[3]};activity.current=active;
 useEffect(()=>{
  let disposed=false,visible=true;
  const timer=setTimeout(()=>{if(!disposed)setFailed(true);},25000);
  const b=createDeskBridge({frame:frame.current,origin:location.origin,onReady:()=>{if(!disposed){clearTimeout(timer);setReady(true);setFailed(false);}},onError:()=>{if(!disposed){setReady(false);setFailed(true);}}});bridge.current=b;
  const sync=()=>b.active(visible&&!document.hidden&&activity.current);
  const receive=e=>b.receive(e);window.addEventListener('message',receive);document.addEventListener('visibilitychange',sync);
  const io=typeof IntersectionObserver==='function'?new IntersectionObserver(es=>{visible=es[0].isIntersecting;sync();}):null;io?.observe(host.current);
  b.update(latest.current);sync();
  return()=>{disposed=true;clearTimeout(timer);b.destroy();bridge.current=null;io?.disconnect();window.removeEventListener('message',receive);document.removeEventListener('visibilitychange',sync);};
 },[attempt]);
 useEffect(()=>{bridge.current?.update(latest.current);bridge.current?.active(active&&!document.hidden);},[mood,active]);
 return <div ref={host} className="desk-character"><img src={`/assets/hero/classic/${mood}.png`} alt={mood} style={{visibility:ready?'hidden':'visible'}}/><iframe key={attempt} ref={frame} title="WojakMeter 3D market emotion" src="/wojak-3d/viewer.html?v=studio-awaken25" sandbox="allow-scripts allow-same-origin" aria-hidden={!ready} tabIndex={ready?0:-1} style={{opacity:ready?1:0}} onLoad={()=>bridge.current?.sync()}/>{failed&&<button type="button" onClick={()=>{setReady(false);setFailed(false);setAttempt(n=>n+1);}}>Retry 3D</button>}<style jsx>{`.desk-character{position:relative;width:100%;aspect-ratio:1}.desk-character img,.desk-character iframe{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border:0;background:transparent}.desk-character iframe{transition:opacity .6s ease;z-index:2}.desk-character button{position:absolute;bottom:0;left:30%;z-index:3;background:#172938;color:white;border:1px solid #405365;border-radius:8px;padding:8px}`}</style></div>;
}
