import {createHmac,timingSafeEqual,scryptSync} from 'node:crypto';
export function settings(){
 const password=process.env.HERO_ADMIN_PASSWORD,secret=process.env.HERO_SESSION_SECRET;
 if(!password||password.length<12||!secret||secret.length<32)throw Error('Set HERO_ADMIN_PASSWORD (12+ characters) and HERO_SESSION_SECRET (32+ characters)');
 return {password,secret};
}
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const mac=(s,k)=>createHmac('sha256',k).update(s).digest('hex');
export function passwordOK(value){const {password,secret}=settings();return equal(scryptSync(String(value),secret,32),scryptSync(password,secret,32));}
export function token(now=Date.now()){const {password,secret}=settings();const body=`${now+8*3600000}.${mac(password,secret).slice(0,16)}`;return `${body}.${mac(body,secret)}`;}
export function authenticated(req,now=Date.now()){
 try{const {password,secret}=settings();const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('wmHeroSession='))?.slice(14);if(!raw)return false;
 const [expiry,version,sig,...extra]=raw.split('.');const body=`${expiry}.${version}`;
 return !extra.length&&Number(expiry)>now&&Number(expiry)<=now+8*3600000&&equal(version,mac(password,secret).slice(0,16))&&equal(sig||'',mac(body,secret));}catch{return false;}
}
export function cookie(value,age=28800){return `wmHeroSession=${value}; HttpOnly; SameSite=Strict; Path=/api/hero-admin; Max-Age=${age}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
export function sameOrigin(req){try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}}
export function rateKey(req){const {secret}=settings();return mac(String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim(),secret);}
