const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../public/wojak-3d/bridge.js','utf8');
function run(){
 const events={},timers=new Map();let id=0,iframe;
 const stage={dataset:{},classList:{toggle(){}},setAttribute(){},getBoundingClientRect:()=>({height:500})};
 const wrap={append(f){iframe=f;}};
 const context={location:{origin:'https://example.test'},getComputedStyle:()=>({getPropertyValue:()=>'.2'}),setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:i=>timers.delete(i),setInterval:()=>1,clearInterval(){},addEventListener:(n,f)=>events[n]=f,document:{hidden:false,head:{append(){}},addEventListener(){},getElementById:id=>id==='heroStage'?stage:wrap,createElement:()=>({contentWindow:{postMessage(){}},setAttribute(){},addEventListener(){}})}};
 context.window=context;vm.runInNewContext(code,context);
 return {stage,timers,msg(type,origin='https://example.test'){events.message({origin,source:iframe.contentWindow,data:{type}});}};
}
let a=run();assert.equal(a.stage.dataset.renderState,'loading');a.msg('wm-ready','https://wrong.test');assert.equal(a.stage.dataset.renderState,'loading');a.msg('wm-ready');assert.equal(a.stage.dataset.renderState,'ready');assert.equal(a.timers.size,0);a.msg('wm-error');assert.equal(a.stage.dataset.renderState,'fallback');a.msg('wm-ready');assert.equal(a.stage.dataset.renderState,'fallback');
a=run();[...a.timers.values()][0]();assert.equal(a.stage.dataset.renderState,'fallback');a.msg('wm-ready');assert.equal(a.stage.dataset.renderState,'ready');
console.log('PASS: loading, ready, timeout, late success, terminal failure, foreign origin');
