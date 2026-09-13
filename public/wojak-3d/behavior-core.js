(function(root){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 class Director{
  constructor(){this.time=0;this.next=1;this.start=-100;this.duration=4;this.kind='wait';this.side=1;this.seed=31;this.tapTimes=[];this.tapStart=-100;this.zone='face';this.angerStart=-100;this.newsSeen=new Set();this.newsInitialized=false;this.newsQueue=[];this.newsAt=-100;this.newsSign=0;this.signals={};this.out={};}
  random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
  tap(zone,t=this.time){
   this.zone=zone;this.tapStart=t;this.tapTimes=this.tapTimes.filter(x=>t-x<=1.8);this.tapTimes.push(t);
   if(this.tapTimes.length>=3){this.angerStart=t;this.tapTimes=[];}
  }
  news(items,now=Date.now()){
   if(!Array.isArray(items))return;
   const fresh=items.filter(n=>typeof n.ts==='number'&&now-n.ts>=0&&now-n.ts<2*3600000&&Number.isFinite(n.score)&&typeof n.url==='string');
   if(!fresh.length)return;
   for(const n of fresh){
    if(this.newsSeen.has(n.url))continue;this.newsSeen.add(n.url);
    const strength=Math.abs(n.score-50)/50;
    if(this.newsInitialized&&strength>=.25)this.newsQueue.push({sign:Math.sign(n.score-50),strength});
   }
   this.newsInitialized=true;
   this.newsQueue=this.newsQueue.slice(-3);
   if(this.newsSeen.size>300)this.newsSeen=new Set([...this.newsSeen].slice(-200));
  }
  envelope(age,duration){return age<0||age>duration?0:Math.sin(Math.PI*clamp(age/duration))**2;}
  step(dt,a,reduced=false){
   this.time+=clamp(dt,0,.1);const t=this.time;
   if(this.newsQueue.length&&t-this.newsAt>20){const n=this.newsQueue.shift();this.newsAt=t;this.newsSign=n.sign;this.newsStrength=n.strength;this.next=t+4;}
   if(t>=this.next){
    this.start=t;this.duration=3.5+this.random()*2;this.side=this.random()<.5?-1:1;
    const r=this.random();
    this.kind=(this.signals.momentum||0)<-.4&&a.valence>.1?'brace':a.fatigue>.65?'exhausted':a.tension>.58?(r<.5?'scan':'brace'):a.valence<-.3?(r<.55?'worry':'scan'):a.valence<-.1?'question':a.valence>.65?'energized':a.valence>.2?(r<.5?'confident':'nod'):(r<.5?'wait':'scan');
    this.next=t+this.duration+1.5+this.random()*3;
   }
   const e=this.envelope(t-this.start,this.duration),motion=reduced?.12:1;
   const o={kind:this.kind,yaw:0,pitch:0,tilt:0,gazeX:0,gazeY:0,brow:0,squint:0,smile:0,jaw:0};
   const k=this.kind;
   if(['scan','worry','wait','question'].includes(k)){o.yaw=this.side*e*(k==='scan'?.38:.20);o.gazeX=this.side*e*.10;o.tilt=this.side*e*(k==='question'?.10:.035);}
   if(k==='brace'){o.pitch=-.065*e;o.brow=.18*e;o.squint=.10*e;}
   if(k==='exhausted'){o.pitch=.14*e;o.gazeY=.07*e;o.squint=.10*e;}
   if(k==='confident'||k==='energized'){o.yaw=this.side*.20*e;o.pitch=-.05*e;o.smile=e*(k==='energized'?.15:.06);}
   if(k==='nod'){o.pitch=.065*e*Math.sin((t-this.start)*3);o.smile=.04*e;}
   if(k==='question')o.brow=.13*e;
   const surprise=this.envelope(t-this.newsAt,3)*(this.newsStrength||0);
   o.pitch-=.065*surprise;o.jaw=.07*surprise;o.brow+=.20*surprise;
   o.news=surprise;o.newsSign=this.newsSign;
   for(const key of ['yaw','pitch','tilt','gazeX','gazeY'])o[key]*=motion;
   const age=t-this.tapStart;
   o.tap=age<0||age>1?0:age<.12?age/.12:age<.3?1:1-clamp((age-.3)/.7);
   const rage=t-this.angerStart;
   o.anger=rage<0||rage>4.2?0:rage<.25?rage/.25:rage<1.5?1:1-clamp((rage-1.5)/2.7);
   o.zone=this.zone;this.out=o;return o;
  }
 }
 root.WMCharacterDirector=Director;
 if(typeof module!=='undefined')module.exports=Director;
})(typeof window!=='undefined'?window:globalThis);
