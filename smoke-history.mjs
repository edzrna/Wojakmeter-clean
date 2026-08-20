/* ===========================================================
   ARNÉS DE /api/history

   Uso:  node smoke-history.mjs [ruta/a/history.js]
   Por defecto busca ./pages/api/history.js desde donde lo corras.

   Por qué existe: `node --check` valida sintaxis, no contenido.
   No detecta que falte una columna en el SELECT, ni que el
   objeto de la serie no la lleve aunque el SELECT sí — que es
   justo el fallo que dejó a hero-rig.js sin `index_score` y a
   las pills del héroe sin poder mover el número.

   Cómo funciona: copia el endpoint a un directorio temporal con
   un `@neondatabase/serverless` falso al lado, así el import se
   resuelve al stub aunque en el repo esté instalado el paquete
   de verdad. No toca la base de datos ni la red.
   =========================================================== */
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const target = resolve(process.argv[2] || "pages/api/history.js");
if (!existsSync(target)) {
  console.error(`No encuentro ${target}\nUso: node smoke-history.mjs [ruta/a/history.js]`);
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "wm-history-"));
const stubDir = join(dir, "node_modules", "@neondatabase", "serverless");
mkdirSync(stubDir, { recursive: true });
copyFileSync(target, join(dir, "history.js"));

writeFileSync(join(stubDir, "package.json"), JSON.stringify({
  name: "@neondatabase/serverless", version: "0.0.0-stub", type: "module", main: "index.js"
}));

writeFileSync(join(stubDir, "index.js"), `
export const __state = { hasColumn: true, queries: [] };

export function neon() {
  return function sql(strings, ...values) {
    const text = strings.join(" ? ").replace(/\\s+/g, " ").trim();
    __state.queries.push({ text, values });

    if (text.includes("information_schema.columns")) {
      return Promise.resolve(__state.hasColumn ? [{ one: 1 }] : []);
    }
    if (text.includes("date_bin")) {
      const base = Date.parse("2026-08-19T00:00:00Z");
      return Promise.resolve([0, 1, 2, 3].map((i) => ({
        t: new Date(base + i * 7200000).toISOString(),
        score: 40 + i, low: 38 + i, high: 44 + i,
        index_score: __state.hasColumn ? (i < 2 ? null : 60 + i) : null,
        index_low:   __state.hasColumn ? (i < 2 ? null : 58 + i) : null,
        index_high:  __state.hasColumn ? (i < 2 ? null : 63 + i) : null,
        change: 1.25
      })));
    }
    if (text.includes("ORDER BY ts DESC LIMIT 1")) {
      return Promise.resolve([{
        score: 43, index_score: __state.hasColumn ? 63 : null,
        mood: "doubt", ts: "2026-08-19T06:00:00Z"
      }]);
    }
    if (text.includes("last_change")) {
      return Promise.resolve([{ since: "2026-08-13T06:00:00Z", seconds: 518400 }]);
    }
    if (text.includes("MIN(score)")) {
      return Promise.resolve([{
        min_score: 38, max_score: 47, avg_score: 42, samples: 96,
        min_index: __state.hasColumn ? 58 : null,
        max_index: __state.hasColumn ? 66 : null,
        avg_index: __state.hasColumn ? 62 : null,
        index_samples: __state.hasColumn ? 48 : 0
      }]);
    }
    if (text.includes("GROUP BY mood")) {
      return Promise.resolve([{ mood: "doubt", n: 60 }, { mood: "neutral", n: 36 }]);
    }
    return Promise.resolve([]);
  };
}
`);

const mod = await import(pathToFileURL(join(dir, "history.js")).href);
const { __state } = await import(pathToFileURL(join(stubDir, "index.js")).href);
const handler = mod.default;
const resetIndexProbe = mod.resetIndexProbe || (() => {});

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); }
};

function makeRes() {
  const res = { statusCode: 0, body: null, headers: {} };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

async function run(query = {}) {
  const res = makeRes();
  await handler({ query }, res);
  return res;
}

process.env.DATABASE_URL = "postgres://stub";

console.log("\n== columna index_score PRESENTE ==");
__state.hasColumn = true;
__state.queries.length = 0;
resetIndexProbe();
let res = await run({ range: "7d" });

ok("status 200", res.statusCode === 200, String(res.statusCode));
ok("ok:true", res.body.ok === true);
ok("hasIndex:true", res.body.hasIndex === true);
ok("rango respetado", res.body.range === "7d", res.body.range);

const sel = __state.queries.find((q) => q.text.includes("date_bin")).text;
ok("SELECT pide index_score", /AVG\(index_score\)/.test(sel));
ok("SELECT pide index_low/high", /MIN\(index_score\)/.test(sel) && /MAX\(index_score\)/.test(sel));
ok("SELECT conserva score viejo", /AVG\(score\)/.test(sel));

const pts = res.body.series;
ok("serie con 4 puntos", pts.length === 4, String(pts.length));
ok("punto lleva index_score (snake)", "index_score" in pts[0]);
ok("punto lleva indexScore (camel)", "indexScore" in pts[0]);
ok("snake y camel coinciden", pts[3].index_score === pts[3].indexScore);
ok("index null se propaga como null", pts[0].index_score === null, String(pts[0].index_score));
ok("index presente se propaga", pts[3].index_score === 63, String(pts[3].index_score));
ok("score viejo intacto", pts[0].score === 40, String(pts[0].score));
ok("mood viejo desde score", pts[0].mood === "doubt", pts[0].mood);
ok("index_mood desde index_score", pts[3].index_mood === "optimism", String(pts[3].index_mood));
ok("index_mood null si no hay indice", pts[0].index_mood === null);
ok("ts es epoch ms", Number.isFinite(pts[0].ts) && pts[0].ts > 1e12);

const st = res.body.stats;
ok("stats.current.indexScore", st.current.indexScore === 63, String(st.current.indexScore));
ok("stats.current.score intacto", st.current.score === 43);
ok("stats.min/max/avg siguen siendo del viejo", st.min === 38 && st.max === 47 && st.avg === 42);
ok("stats.avgIndex separado", st.avgIndex === 62, String(st.avgIndex));
ok("stats.indexSamples", st.indexSamples === 48, String(st.indexSamples));
ok("streakSeconds numerico", st.streakSeconds === 518400);
ok("distribution suma 100", st.distribution.reduce((s, d) => s + d.pct, 0) === 100,
   JSON.stringify(st.distribution));
ok("cache-control puesto", /s-maxage=300/.test(res.headers["Cache-Control"] || ""));

console.log("\n== columna index_score AUSENTE (market-index.sql sin ejecutar) ==");
__state.hasColumn = false;
__state.queries.length = 0;
resetIndexProbe();
res = await run({ range: "30d" });

ok("sigue devolviendo 200", res.statusCode === 200);
ok("ok:true — no se cae la seccion", res.body.ok === true);
ok("hasIndex:false", res.body.hasIndex === false);
ok("serie NO vacia", res.body.series.length === 4, String(res.body.series.length));
ok("index_score null en todos", res.body.series.every((p) => p.index_score === null));
ok("score viejo sigue vivo", res.body.series[0].score === 40);
const sel2 = __state.queries.find((q) => q.text.includes("date_bin")).text;
ok("no se pide la columna inexistente", !/AVG\(index_score\)/.test(sel2));
ok("indexSamples 0", res.body.stats.indexSamples === 0);

console.log("\n== rango invalido ==");
__state.hasColumn = true;
resetIndexProbe();
res = await run({ range: "../etc/passwd" });
ok("cae a 7d", res.body.range === "7d", res.body.range);

console.log("\n== sin DATABASE_URL ==");
delete process.env.DATABASE_URL;
res = await run({ range: "7d" });
ok("ok:false, series []", res.body.ok === false && Array.isArray(res.body.series));

console.log(`\n${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);
