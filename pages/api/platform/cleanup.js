import {timingSafeEqual} from 'node:crypto';
import {db} from '../../../lib/platform-store';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).end();
 const expected=process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:'';
 const actual=String(req.headers.authorization||'');
 if(!expected||expected.length!==actual.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return res.status(401).end();
 try{const sql=db();await sql.transaction([
 sql`DELETE FROM wm_analytics_events WHERE received_at<now()-interval '90 days'`,
 sql`DELETE FROM wm_platform_limits WHERE bucket<floor(extract(epoch FROM now())/600)-144`,
 sql`DELETE FROM wm_hero_login_limits WHERE bucket<floor(extract(epoch FROM now())/900)-96`
 ]);return res.json({ok:true});}catch{return res.status(503).json({error:'cleanup_failed'});}
}
