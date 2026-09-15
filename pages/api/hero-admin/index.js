import {authenticated,passwordOK,token,cookie,sameOrigin,rateKey,settings} from '../../../lib/hero-auth';
import {current,publish,db} from '../../../lib/hero-store';
export const config={api:{bodyParser:{sizeLimit:'128kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 const action=req.method==='POST'?req.body?.action:req.query.action||'state';
 if(req.method==='POST'&&!sameOrigin(req))return res.status(403).json({error:'Same-origin request required'});
 try{
  settings();
  if(action==='login'&&req.method==='POST'){
   if(typeof req.body.password!=='string'||req.body.password.length>256)return res.status(400).json({error:'Invalid password'});
   const sql=db(),key=rateKey(req),bucket=Math.floor(Date.now()/900000);
   const attempts=await sql`INSERT INTO wm_hero_login_limits (key,bucket,attempts) VALUES (${key},${bucket},1) ON CONFLICT(key,bucket) DO UPDATE SET attempts=wm_hero_login_limits.attempts+1 RETURNING attempts`;
   if(attempts[0].attempts>10){res.setHeader('Retry-After','900');return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});}
   if(!passwordOK(req.body.password))return res.status(401).json({error:'Incorrect password'});
   res.setHeader('Set-Cookie',cookie(token()));return res.json({ok:true});
  }
  if(!authenticated(req))return res.status(401).json({error:'Sign in to Hero Studio'});
  if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',cookie('',0));return res.json({ok:true});}
  if(action==='state'&&req.method==='GET')return res.json(await current());
  if(action==='history'&&req.method==='GET')return res.json({versions:await db()`SELECT revision,note,created_at FROM wm_hero_versions ORDER BY revision DESC LIMIT 30`});
  if(action==='version'&&req.method==='GET'){
   const rev=Number(req.query.revision);if(!Number.isSafeInteger(rev)||rev<1)return res.status(400).json({error:'Invalid revision'});
   const rows=await db()`SELECT revision,config FROM wm_hero_versions WHERE revision=${rev}`;
   return rows.length?res.json(rows[0]):res.status(404).json({error:'Revision not found'});
  }
  if(action==='publish'&&req.method==='POST'){
   const rev=req.body.expectedRevision;if(!Number.isSafeInteger(rev)||rev<0)return res.status(400).json({error:'Invalid revision'});
   const note=typeof req.body.note==='string'?req.body.note.trim().slice(0,160):'';
   return res.json(await publish(req.body.config,rev,note));
  }
  return res.status(400).json({error:'Unknown action'});
 }catch(err){console.error('[Hero Studio]',err.code||err.status||err.name);const userError=/Invalid|Unknown|range|roughness|Unsupported/.test(err.message);res.status(err.status|| (userError?400:503)).json({error:err.status===409||userError?err.message:'Hero Studio is unavailable. Check database migration and server environment variables.'});}
}
