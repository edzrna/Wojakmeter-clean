const defaults = require('../public/hero-studio/defaults.json');
const clone = v => JSON.parse(JSON.stringify(v));
function range(path) {
 const k=path.split('.').pop();
 if(path.includes('.morphs.'))return [0,1,.01];
 if(k==='color'||k.endsWith('Color'))return null;
 if(['x','y','z'].includes(k))return [-4,4,.05];
 if(k==='angle')return [10,80,1];if(k==='penumbra')return [0,1,.01];
 if(k==='headRange')return [0,45,1];if(k==='transition')return [.3,8,.1];
 if(k==='blur')return [0,48,.5];if(k==='fade')return [0,.55,.01];
 if(k==='softness')return [0,8,.25];if(k==='ao')return [0,2,.05];
 if(path.includes('lighting.lights')&&k==='intensity')return [0,8,.02];
 if(path.includes('effects.emotions'))return k==='speed'?[.1,3,.05]:[0,1,.01];
 if(k==='mouthShadow')return [0,1,.01];
 if(path.startsWith('materials.'))return k==='skinNormal'||k==='hoodieNormal'||k==='eyeShadow'||k==='mouthShadow'?[0,2,.02]:[0,1,.01];
 if(['irisTint','bloomRadius'].includes(k))return [0,1,.01];
 if(k==='bloomThreshold')return [.5,2,.01];if(k==='blinkDuration')return [.5,2,.05];
 if(k==='breathRate'||k==='blinkRate')return [.25,2.5,.05];
 return [0,3,.01];
}
function validate(input) {
 function walk(v,t,p){
  if(t&&typeof t==='object'){
   if(!v||typeof v!=='object'||Array.isArray(v))throw Error(`Invalid ${p}`);
   if(Object.keys(v).some(k=>!Object.hasOwn(t,k)))throw Error(`Unknown field in ${p}`);
   const out={};for(const k of Object.keys(t))out[k]=walk(v[k],t[k],p?`${p}.${k}`:k);return out;
  }
  if(typeof t==='number'){
   if(p==='version'||p.endsWith('.version')){if(v!==1)throw Error('Unsupported version');return v;}
   const [min,max]=range(p);if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`Out of range: ${p}`);return v;
  }
  if(typeof t==='boolean'){if(typeof v!=='boolean')throw Error(`Invalid ${p}`);return v;}
  if(/^#[a-f0-9]{6}$/i.test(t)){if(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v))throw Error(`Invalid color: ${p}`);return v.toLowerCase();}
  if(v!==t)throw Error(`Invalid constant: ${p}`);return v;
 }
 const out=walk(input,defaults,'');if(out.materials.skinRoughMin>out.materials.skinRoughMax)throw Error('Skin roughness minimum exceeds maximum');return out;
}
module.exports={defaults,clone,range,validate};
