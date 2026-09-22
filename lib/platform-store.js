import {neon} from '@neondatabase/serverless';
import {validateConfig} from './platform-schema';
export function db(){if(!process.env.DATABASE_URL)throw Error('Database not configured');return neon(process.env.DATABASE_URL);}
export async function current(){const rows=await db()`SELECT revision,config,updated_at FROM wm_platform_settings WHERE id=1`;if(!rows.length)throw Error('Migration required');return {...rows[0],config:validateConfig(rows[0].config)};}
export async function publish(config,revision,note){
 const clean=validateConfig(config);
 if(!Number.isSafeInteger(revision)||revision<0||typeof note!=='string'||note.trim().length<3||note.length>180){const e=Error('Revisión o motivo inválido');e.status=400;throw e;}
 const rows=await db()`WITH changed AS (UPDATE wm_platform_settings SET config=${JSON.stringify(clean)}::jsonb,revision=revision+1,updated_at=now() WHERE id=1 AND revision=${revision} RETURNING *) INSERT INTO wm_platform_audit(revision,config,note,created_at) SELECT revision,config,${note.trim()},updated_at FROM changed RETURNING revision,config,created_at`;
 if(!rows.length){const e=Error('Otra sesión publicó cambios. Recarga antes de guardar.');e.status=409;throw e;}return rows[0];
}
export async function limit(key,max=240){const bucket=Math.floor(Date.now()/600000);const rows=await db()`INSERT INTO wm_platform_limits(key,bucket,attempts) VALUES(${key},${bucket},1) ON CONFLICT(key,bucket) DO UPDATE SET attempts=wm_platform_limits.attempts+1 RETURNING attempts`;return rows[0].attempts<=max;}
export async function featureWriteAllowed(req,res,feature){
 if(req.method!=='POST')return true;
 try{const state=await current();if(state.config.features[feature])return true;res.status(503).json({ok:false,error:'feature_disabled',message:'This feature is temporarily unavailable.'});}
 catch{res.status(503).json({ok:false,error:'configuration_unavailable',message:'Please try again later.'});}
 return false;
}
export async function report(days){
 const sql=db(),since=new Date(Date.now()-days*86400000).toISOString();
 const [totals,daily,pages,actions,sections,sources,devices,browsers,scroll,vitals,live,lastEvent]=await Promise.all([
 sql`SELECT count(*) FILTER(WHERE type='page_view')::int AS views,count(DISTINCT session_id)::int AS sessions,count(*) FILTER(WHERE type='click')::int AS clicks,coalesce(sum(value) FILTER(WHERE type='heartbeat'),0)::float AS active_seconds FROM wm_analytics_events WHERE received_at>=${since}::timestamptz`,
 sql`SELECT to_char(received_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,count(*) FILTER(WHERE type='page_view')::int AS views,count(DISTINCT session_id)::int AS sessions,count(*) FILTER(WHERE type='click')::int AS clicks FROM wm_analytics_events WHERE received_at>=${since}::timestamptz GROUP BY 1 ORDER BY 1`,
 sql`SELECT path AS name,count(*)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz AND type='page_view' GROUP BY 1 ORDER BY 2 DESC`,
 sql`SELECT label AS name,count(*)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz AND type='click' GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
 sql`SELECT label AS name,count(DISTINCT session_id)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz AND type='section_view' GROUP BY 1 ORDER BY 2 DESC`,
 sql`SELECT source AS name,count(DISTINCT session_id)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz AND type='page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 20`,
 sql`SELECT device AS name,count(DISTINCT session_id)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz GROUP BY 1 ORDER BY 2 DESC`,
 sql`SELECT browser AS name,count(DISTINCT session_id)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz GROUP BY 1 ORDER BY 2 DESC`,
 sql`SELECT value::text AS name,count(DISTINCT session_id)::int AS value FROM wm_analytics_events WHERE received_at>=${since}::timestamptz AND type='scroll' GROUP BY wm_analytics_events.value ORDER BY wm_analytics_events.value`,
 sql`SELECT label AS name,round((percentile_cont(0.75) WITHIN GROUP(ORDER BY value))::numeric,3)::float AS value,count(*)::int AS samples FROM wm_analytics_events WHERE received_at>=${since}::timestamptz AND type='web_vital' GROUP BY 1`,
 sql`SELECT count(DISTINCT session_id)::int AS value FROM wm_analytics_events WHERE received_at>now()-interval '5 minutes'`,
 sql`SELECT max(received_at) AS value FROM wm_analytics_events`
 ]);
 return {days,generatedAt:new Date().toISOString(),totals:totals[0],daily,pages,actions,sections,sources,devices,browsers,scroll,vitals,live:live[0].value,lastEvent:lastEvent[0].value};
}
