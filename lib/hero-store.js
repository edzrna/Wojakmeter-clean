import {neon} from '@neondatabase/serverless';
import schema from './hero-schema';
export function db(){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is not configured');return neon(process.env.DATABASE_URL);}
export async function current(){const rows=await db()`SELECT revision, config, updated_at FROM wm_hero_settings WHERE id=1`;if(!rows.length)throw Error('Run the Hero Studio SQL migration');const r=rows[0];return {revision:r.revision,config:r.config?schema.validate(r.config):schema.clone(schema.defaults),updatedAt:r.updated_at};}
export async function publish(config,expected,note){
 const clean=schema.validate(config),sql=db();
 const rows=await sql`WITH changed AS (UPDATE wm_hero_settings SET config=${JSON.stringify(clean)}::jsonb, revision=revision+1, updated_at=now() WHERE id=1 AND revision=${expected} RETURNING revision,config,updated_at)
 INSERT INTO wm_hero_versions (revision,config,note,created_at) SELECT revision,config,${note},updated_at FROM changed RETURNING revision,created_at`;
 if(!rows.length){const err=Error('Another session published changes. Reload the latest revision before publishing.');err.status=409;throw err;}
 return {revision:rows[0].revision,updatedAt:rows[0].created_at,config:clean};
}
