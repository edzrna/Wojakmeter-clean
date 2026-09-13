const assert=require('node:assert/strict');
const response=require('../public/wojak-3d/market-response.js');
const now=1800000000000,base={marketScore:28,arousal:.3,tension:.2,fatigue:.4};
const calm={ok:true,ts:now,delta:0,parts:{}};
const stress={...calm,delta:-20,parts:{headlines:-.9,volumeAnom:.8}};
const a=response(base,calm,null,now),b=response(base,stress,null,now);
assert.equal(a.valence,b.valence);assert.ok(b.arousal>a.arousal);assert.ok(b.tension>a.tension);
assert.deepEqual(response(base,{...stress,ts:now-3600000},null,now),{...base,valence:28/50-1});
assert.deepEqual(response(base,stress,{delta:0},now),response(base,calm,{delta:0},now));
for(const score of [0,19,20,34,35,44,45,59,60,69,70,84,85,100]){
 const r=response({...base,marketScore:score},stress,null,now);
 assert.equal(r.valence,score/50-1);
 for(const key of ['arousal','tension','fatigue','intensity'])assert.ok(r[key]>=0&&r[key]<=1);
}
assert.equal(response(base,{ok:false},null,now).arousal,base.arousal);
console.log('Market response: boundaries, stress, stale/missing data, timeframe isolation OK');
