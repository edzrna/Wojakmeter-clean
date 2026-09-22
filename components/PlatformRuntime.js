import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/router';
import {FEATURES,PAGES,SECTIONS,CLICKS} from '../lib/platform-schema';
import css from '../styles/platform-runtime.module.css';
const CHOICE='wmAnalyticsChoiceV1';
function stored(key){try{return localStorage.getItem(key);}catch{return null;}}
export function clickName(node){
 const el=node?.closest?.('button,a,[role="button"],select');if(!el)return null;
 if(CLICKS[el.id])return CLICKS[el.id];
 if(el.closest('#bagSuggestions'))return 'bag_suggestion';
 if(el.hasAttribute('data-edit-bag'))return 'bag_edit';
 if(el.hasAttribute('data-buy-bag'))return 'bag_add_purchase';
 if(el.closest('#coinsGrid,#trendingGrid,#memesGrid'))return 'coin_open';
 if(el.closest('#heroTimeframes,#chartTimeframes'))return 'timeframe_change';
 if(el.closest('#marketTabs'))return 'market_tab';
 if(el.closest('#wojak-studio'))return 'studio_action';
 if(el.matches('.lp-mood'))return 'welcome_explore';
 if(el.tagName==='A'&&el.getAttribute('href')==='/dashboard')return 'dashboard_open';
 return null;
}
export default function PlatformRuntime(){
 const router=useRouter(),path=router.pathname;
 const eligible=PAGES.includes(path);
 const [config,setConfig]=useState(null),[choice,setChoice]=useState(null),[privacy,setPrivacy]=useState(false),[blocked,setBlocked]=useState(false);
 const configRef=useRef(null),vitalsCollected=useRef(false);
 useEffect(()=>{if(path.startsWith('/admin')){try{localStorage.setItem('wmAnalyticsAdmin','1');}catch{}}setChoice(stored(CHOICE));setBlocked(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||stored('wmAnalyticsAdmin')==='1');},[path]);
 useEffect(()=>{
  if(!eligible)return;
  let disposed=false,controller;
  async function refresh(){if(document.hidden)return;controller?.abort();controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
   try{const res=await fetch('/api/platform/config',{cache:'no-store',signal:controller.signal});if(!res.ok)return;const next=await res.json();if(!disposed){configRef.current=next;setConfig(next);}}
   catch{}finally{clearTimeout(timeout);}
  }
  refresh();const timer=setInterval(refresh,30000);document.addEventListener('visibilitychange',refresh);
  return()=>{disposed=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
 },[eligible]);
 useEffect(()=>{
  if(!config)return;
  if(config.features?.game===false)document.getElementById('rushClose')?.click();
  if(config.features?.bubbleMaps===false)document.getElementById('heroViewMoodBtn')?.click();
  if(config.features?.bagMood===false)document.getElementById('bagEditor')?.close?.();
 },[config]);
 useEffect(()=>{
  if(!eligible||!config?.analyticsEnabled||choice!=='yes'||blocked)return;
  let session;
  let source='';try{source=new URL(document.referrer).origin;}catch{}
  try{const old=JSON.parse(sessionStorage.getItem('wmAnalyticsSession')||'null');const reuse=old&&Date.now()-old.at<1800000;session=reuse?old.id:crypto.randomUUID();if(reuse)source=old.source||'';sessionStorage.setItem('wmAnalyticsSession',JSON.stringify({id:session,source,at:Date.now()}));}catch{session=crypto.randomUUID();}
  let queue=[],sending=false,stopped=false,cooldown=0,active=0,last=performance.now(),lcp=0,cls=0,vitalsSent=false,lastSessionActivity=Date.now();
  const seen=new Set(),depths=new Set();
  function emit(type,label='',value=0){if(stopped||!configRef.current?.analyticsEnabled||stored(CHOICE)!=='yes'||stored('wmAnalyticsAdmin')==='1')return;queue.push({id:crypto.randomUUID(),type,path,label,value});queue=queue.slice(-100);}
  async function flush(beacon=false){
   if(sending||!queue.length||Date.now()<cooldown)return;
   if(stored(CHOICE)!=='yes'||stored('wmAnalyticsAdmin')==='1'||!configRef.current?.analyticsEnabled){queue=[];return;}
   const batch=queue.splice(0,20),body=JSON.stringify({session,source,events:batch});
   if(beacon&&navigator.sendBeacon?.('/api/platform/events',new Blob([body],{type:'application/json'})))return;
   sending=true;
   try{const res=await fetch('/api/platform/events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true});if(res.status===429){cooldown=Date.now()+600000;queue.unshift(...batch);}else if(res.status>=500){cooldown=Date.now()+60000;queue.unshift(...batch);}}
   catch{cooldown=Date.now()+60000;queue.unshift(...batch);}finally{sending=false;queue=queue.slice(-100);}
  }
  function tick(){if(!document.hidden&&document.hasFocus()&&Date.now()-lastSessionActivity>1800000){flush(true);if(queue.length||sending)return;session=crypto.randomUUID();lastSessionActivity=Date.now();seen.clear();depths.clear();emit('page_view');}const now=performance.now(),delta=Math.min(5,(now-last)/1000);last=now;if(!document.hidden&&document.hasFocus())active+=delta;
   if(active>=10){emit('heartbeat','',Math.min(30,Math.round(active)));active=0;lastSessionActivity=Date.now();try{sessionStorage.setItem('wmAnalyticsSession',JSON.stringify({id:session,source,at:Date.now()}));}catch{}}
  }
  function sendVitals(){if(vitalsSent||vitalsCollected.current)return;vitalsSent=true;vitalsCollected.current=true;if(lcp)emit('web_vital','LCP',lcp);if(clsSupported)emit('web_vital','CLS',cls);}
  function hide(){if(document.hidden){if(active>0)emit('heartbeat','',Math.round(active));active=0;sendVitals();flush(true);}last=performance.now();}
  function click(e){if(e.type==='click'&&e.target?.closest?.('select'))return;const name=clickName(e.target);if(name)emit('click',name);}
  function scroll(){const max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;const pct=Math.min(100,Math.ceil(scrollY/max*100));for(const n of [25,50,75,100])if(pct>=n&&!depths.has(n)){depths.add(n);emit('scroll','',n);}}
  const io='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!seen.has(e.target.id)){seen.add(e.target.id);const key=Object.keys(SECTIONS).find(k=>e.target.matches(SECTIONS[k]));if(key)emit('section_view',key);}}),{threshold:0.1}):null;
  const observed=new WeakSet();function observe(){Object.values(SECTIONS).forEach(s=>{const el=document.querySelector(s);if(el&&!observed.has(el)){observed.add(el);io?.observe(el);}});}
  observe();const mutation=new MutationObserver(observe);mutation.observe(document.body,{childList:true,subtree:true});
  const observers=[];
  try{const po=new PerformanceObserver(list=>{for(const e of list.getEntries())lcp=e.startTime;});po.observe({type:'largest-contentful-paint',buffered:true});observers.push(po);}catch{}
  // Maximum session-window CLS, rather than summing the entire page lifetime.
  let windowScore=0,windowStart=0,previousShift=0,clsSupported=false;
  try{const po=new PerformanceObserver(list=>{for(const e of list.getEntries()){if(e.hadRecentInput)continue;if(e.startTime-previousShift>1000||e.startTime-windowStart>5000){windowScore=0;windowStart=e.startTime;}windowScore+=e.value;previousShift=e.startTime;cls=Math.max(cls,windowScore);}});if(PerformanceObserver.supportedEntryTypes?.includes('layout-shift')){po.observe({type:'layout-shift',buffered:true});clsSupported=true;observers.push(po)};}catch{}
  emit('page_view');flush();
  const heartbeat=setInterval(tick,1000),sender=setInterval(()=>flush(),15000);
  document.addEventListener('click',click,true);document.addEventListener('change',click,true);document.addEventListener('visibilitychange',hide);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pagehide',hide);
  return()=>{sendVitals();if(active>0)emit('heartbeat','',Math.min(30,Math.round(active)));flush(true);stopped=true;clearInterval(heartbeat);clearInterval(sender);io?.disconnect();mutation.disconnect();observers.forEach(o=>o.disconnect());document.removeEventListener('click',click,true);document.removeEventListener('change',click,true);document.removeEventListener('visibilitychange',hide);window.removeEventListener('scroll',scroll);window.removeEventListener('pagehide',hide);};
 },[eligible,path,config?.analyticsEnabled,choice,blocked]);
 function choose(value){try{localStorage.setItem(CHOICE,value);}catch{}setChoice(value);setPrivacy(false);}
 if(!eligible)return null;
 const rules=config?Object.entries(FEATURES).filter(([k])=>config.features?.[k]===false).map(([,v])=>`${v.selector}{display:none!important}`).join('\n'):'';
 return <><style>{rules}</style>{config?.announcement&&<aside className={css.announcement} role="status">{config.announcement}</aside>}
 {config?.analyticsEnabled&&!blocked&&<><button className={css.privacy} onClick={()=>setPrivacy(true)} aria-label="Analytics preferences">Privacy</button>{(!choice||privacy)&&<aside className={css.consent} aria-label="Analytics preferences"><strong>Help improve WojakMeter</strong><p>Allow anonymous usage measurement: pages, feature clicks and active time. We never record your portfolio values or what you type. <a href="/privacy">Privacy policy</a></p><div><button onClick={()=>choose('no')}>No thanks</button><button onClick={()=>choose('yes')}>Allow analytics</button></div></aside>}</>}
 </>;
}
