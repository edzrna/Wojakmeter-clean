import {authenticated,sameOrigin} from '../../../lib/hero-auth';
import {current,publish,report,db} from '../../../lib/platform-store';
export const config={api:{bodyParser:{sizeLimit:'8kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return res.status(405).end();
 if(!authenticated(req))return res.status(401).json({error:'Inicia sesión para continuar'});
 if(req.method==='POST'&&!sameOrigin(req))return res.status(403).json({error:'Origen no permitido'});
 try{
 if(req.method==='POST'){
  if(req.body?.action!=='publish')return res.status(400).json({error:'Acción inválida'});
  try{return res.json(await publish(req.body.config,req.body.revision,req.body.note));}catch(e){if(/inválid/.test(e.message))e.status=400;throw e;}
 }
 const action=req.query.action||'state';
 if(action==='state')return res.json(await current());
 if(action==='report'){const days=Number(req.query.days||7);if(![1,7,30,90].includes(days))return res.status(400).json({error:'Periodo inválido'});return res.json(await report(days));}
 if(action==='history')return res.json({items:await db()`SELECT revision,config,note,created_at FROM wm_platform_audit ORDER BY revision DESC LIMIT 50`});
 return res.status(400).json({error:'Acción inválida'});
 }catch(e){console.error('[Platform admin]',e.code||e.name);return res.status(e.status||503).json({error:e.status?e.message:'Panel no disponible. Revisa DATABASE_URL y la migración 001_platform.sql.'});}
}
