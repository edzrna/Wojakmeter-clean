/* Existing index API is the only source. No extra polling or invented news events. */
(function(root){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 function response(base,snapshot,windowData,now=Date.now()){
  const out={...base};
  const score=finite(base.marketScore)?base.marketScore:50;
  out.valence=clamp(score,0,100)/50-1;
  const fresh=snapshot?.ok===true&&finite(snapshot.ts)&&now-snapshot.ts>=-60000&&now-snapshot.ts<45*60000;
  if(!fresh)return out;
  const historical=!!windowData;
  const delta=historical?windowData.delta:snapshot.delta;
  const motion=finite(delta)?Math.tanh(delta/(historical?30:18)):0;
  // Axes already contain volatility and disagreement; modifiers stay modest.
  const parts=historical?{}:snapshot.parts||{};
  const headlines=finite(parts.headlines)?clamp(parts.headlines,-1,1):0;
  const volume=finite(parts.volumeAnom)?Math.abs(clamp(parts.volumeAnom,-1,1)):0;
  out.behaviorSignals={momentum:motion,volumePressure:volume,headlineTone:headlines};
  const adverse=score<45?Math.max(0,-motion):score>59?Math.max(0,-motion)*.6:Math.abs(motion)*.35;
  const newsPressure=Math.max(0,-headlines);
  out.arousal=clamp((finite(base.arousal)?base.arousal:.15)+.10*volume+.08*Math.abs(headlines));
  out.tension=clamp((finite(base.tension)?base.tension:.1)+.12*adverse+.10*newsPressure);
  out.fatigue=clamp(finite(base.fatigue)?base.fatigue:.1);
  out.intensity=clamp(.55+.17*out.arousal+.10*out.tension,.55,.82);
  return out;
 }
 root.WMMarketResponse=response;
 if(typeof module!=='undefined')module.exports=response;
})(typeof window!=='undefined'?window:globalThis);
