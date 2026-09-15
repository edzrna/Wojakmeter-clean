import {current} from '../../lib/hero-store';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 try{const data=await current();res.setHeader('Cache-Control','public, max-age=0, s-maxage=10, stale-while-revalidate=20');return res.json(data);}
 catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'Hero settings temporarily unavailable; built-in or last loaded settings remain active.'});}
}
