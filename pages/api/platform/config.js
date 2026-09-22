import {current} from '../../../lib/platform-store';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).end();
 try{const {revision,config}=await current();return res.json({revision,...config});}
 catch{return res.status(503).json({error:'configuration_unavailable'});}
}
