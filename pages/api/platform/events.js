import {createHmac} from 'node:crypto';
import {sameOrigin,settings,authenticated} from '../../../lib/hero-auth';
import {normalizeBatch,sourceHost,deviceType,browserType} from '../../../lib/platform-schema';
import {current,db,limit} from '../../../lib/platform-store';
export const config={api:{bodyParser:{sizeLimit:'16kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();
 if(!sameOrigin(req))return res.status(403).end();
 if(authenticated(req)||req.headers.dnt==='1'||req.headers['sec-gpc']==='1')return res.status(204).end();
 const ua=String(req.headers['user-agent']||'');if(/bot|crawler|spider|headless/i.test(ua))return res.status(204).end();
 let events;try{events=normalizeBatch(req.body);}catch{return res.status(400).json({error:'invalid_events'});}
 try{
 const {secret}=settings();
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 const day=new Date().toISOString().slice(0,10);
 const key=createHmac('sha256',secret).update(day+':'+ip).digest('hex');
 if(!await limit(key)){res.setHeader('Retry-After','600');return res.status(429).json({error:'rate_limited'});}
 if(!(await current()).config.analyticsEnabled)return res.status(204).end();
 const rows=events.map(e=>({...e,session_id:req.body.session,source:sourceHost(req.body.source),device:deviceType(ua),browser:browserType(ua)}));
 await db()`INSERT INTO wm_analytics_events(id,session_id,type,path,label,value,source,device,browser) SELECT id::uuid,session_id::uuid,type,path,label,value,source,device,browser FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(id text,session_id text,type text,path text,label text,value numeric,source text,device text,browser text) ON CONFLICT(id) DO NOTHING`;
 return res.status(204).end();
 }catch(e){console.error('[Platform events]',e.code||e.name);return res.status(503).json({error:'analytics_unavailable'});}
}
