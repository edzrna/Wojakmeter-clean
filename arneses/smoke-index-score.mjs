/* ===========================================================
   ARNÉS DE /api/index-score

   Uso:  node smoke-index-score.mjs [pages/api/index-score.js] [public/hero-rig.js]

   Por qué existe: el cliente llevaba meses leyendo `data.windows`
   y el endpoint no lo devolvía. No hay error posible en eso —
   `undefined?.["24h"]` es `undefined`, el código sigue, y el
   personaje se queda con el índice del momento en las tres pills.
   Un contrato escrito por un solo lado no falla: calla.

   Este arnés comprueba las dos puntas: que el endpoint mande las
   ventanas con sus ejes, y que el rig las use.

   Copia el endpoint a un temporal con un `@neondatabase/serverless`
   y un `lib/` falsos al lado. No toca red ni base de datos.
   =========================================================== */
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const target = resolve(process.argv[2] || "pages/api/index-score.js");
const rigPath = resolve(process.argv[3] || "public/hero-rig.js");

if (!existsSync(target)) {
  console.error(`No encuentro ${target}`);
  process.exit(2);
}

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); }
};

/* ---------- montar el entorno falso ---------- */
const dir = mkdtempSync(join(tmpdir(), "wm-index-"));
mkdirSync(join(dir, "pages", "api"), { recursive: true });
mkdirSync(join(dir, "lib"), { recursive: true });
const stubDir = join(dir, "node_modules", "@neondatabase", "serverless");
mkdirSync(stubDir, { recursive: true });

/* Next resuelve `../../lib/market-index` sin extensión; Node ESM a
   secas no. Se le añade el `.js` SOLO en la copia temporal: es la
   única diferencia entre lo que se prueba y lo que se despliega, y
   no toca ninguna línea de lógica. */
writeFileSync(
  join(dir, "pages", "api", "index-score.js"),
  readFileSync(target, "utf-8").replace(
    /(from\s+["']\.\.\/\.\.\/lib\/[\w-]+)(["'])/g, "$1.js$2")
);

writeFileSync(join(stubDir, "package.json"), JSON.stringify({
  name: "@neondatabase/serverless", version: "0.0.0-stub", type: "module", main: "index.js"
}));

writeFileSync(join(stubDir, "index.js"), `
export const __state = { rows: {}, queries: [] };
export function neon() {
  return function sql(strings, ...values) {
    const text = strings.join(" ? ").replace(/\\s+/g, " ").trim();
    __state.queries.push(text);
    if (text.includes("ORDER BY ts DESC LIMIT 1") && text.includes("index_parts")) {
      return Promise.resolve(__state.rows.latest ?? []);
    }
    if (text.includes("INTERVAL '1 hour'")) return Promise.resolve(__state.rows.hourAgo ?? []);
    if (text.includes("EXTRACT(EPOCH")) return Promise.resolve([{ seconds: 260000 }]);
    if (text.includes("VALUES")) return Promise.resolve(__state.rows.windows ?? []);
    return Promise.resolve([]);
  };
}
`);

/* deriveAxes falso: devuelve los ejes en función de la entrada, para
   poder comprobar que cada ventana recibe SU entrada y no la del
   momento. No reproduce la fórmula real, solo la traza. */
writeFileSync(join(dir, "lib", "market-index.js"), `
export const WEIGHTS = { ret:0.30, breadth:0.22, vol:0.15, volume:0.13, dom:0.10, head:0.10 };
export function moodFromScore(s){
  if (s>=85) return "euphoria"; if (s>=70) return "content"; if (s>=60) return "optimism";
  if (s>=45) return "neutral";  if (s>=35) return "doubt";   if (s>=20) return "concern";
  return "frustration";
}
`);
writeFileSync(join(dir, "lib", "hero-profiles.js"), `
export const PROFILES = { straight: { name:"Straight", tagline:"t", blurb:"b" } };
export const PROFILE_ORDER = ["straight"];
export const applyProfile = (s) => s;
export const disagreementFrom = () => 0.2;
export function deriveAxes({ canonicalScore, delta, volatilityZ, streakSeconds }) {
  return {
    expressive: canonicalScore,
    mood: "x",
    axes: {
      valence: canonicalScore / 100,
      arousal: Math.min(Math.abs(delta) / 20, 1),
      tension: Math.min(Math.abs(volatilityZ), 1),
      fatigue: Math.min(streakSeconds / 604800, 1)
    }
  };
}
`);

const { __state } = await import(pathToFileURL(join(stubDir, "index.js")).href);
const mod = await import(pathToFileURL(join(dir, "pages", "api", "index-score.js")).href);
const handler = mod.default;

function makeRes() {
  const res = { statusCode: 0, body: null, headers: {} };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}
const run = async (query = {}) => {
  const res = makeRes();
  await handler({ query }, res);
  return res;
};

process.env.DATABASE_URL = "postgres://stub";

__state.rows.latest = [{
  ts: "2026-08-22T09:00:00Z", score: 41, index_score: 38, index_conf: 0.9,
  index_parts: { ret: -1.2, breadth: -0.8 }, mood: "doubt",
  breadth: 0.3, volatility: 0.4, change_24h: -3.1
}];
__state.rows.hourAgo = [{ index_score: 44 }];

/* 24H se desploma 40 puntos; 7D baja 8; 30D sube 2. Si las tres
   reaccionaran igual, este arnés lo cazaría. */
/* El caso que se vio en pantalla: media 31, primer punto 15,
   ultimo 52. Con la media como score salia "up 37 · SCORE 31 ·
   Concern", tres cosas que no pueden ser ciertas a la vez. */
__state.rows.windows = [
  { key: "24h", avg_score: 31, volatility: 0.9, samples: 96, first_score: 15, last_score: 52 },
  { key: "7d",  avg_score: 44, volatility: 0.3, samples: 84, first_score: 60, last_score: 52 },
  { key: "30d", avg_score: 58, volatility: 0.1, samples: 90, first_score: 50, last_score: 52 },
  { key: "90d", avg_score: 55, volatility: 0.1, samples: 2,  first_score: 54, last_score: 55 }
];

console.log("\n== el endpoint devuelve las ventanas ==");
let res = await run();
ok("status 200 y ok:true", res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body?.error));

const W = res.body.windows;
ok("existe el objeto windows", !!W && typeof W === "object");
ok("trae 24h, 7d y 30d", W && ["24h","7d","30d"].every((k) => W[k]), Object.keys(W || {}).join(", "));
ok("descarta la ventana con menos de 3 lecturas", W && !W["90d"]);

console.log("\n== cada ventana lleva SU score y SU delta ==");
ok("el score es el de AHORA, no la media del periodo",
   W["24h"].score === 52, `${W["24h"]?.score} (media ${W["24h"]?.avgScore})`);
ok("la media sigue disponible, pero etiquetada", W["24h"].avgScore === 31, String(W["24h"]?.avgScore));

/* La comprobación que habría cazado el fallo: score y delta tienen
   que poder convivir. Si el score es 31 y subió 37, el periodo
   empezó en -6, que no existe. */
["24h", "7d", "30d"].forEach((k) => {
  const inicio = W[k].score - W[k].delta;
  ok(`${k}: score y delta son compatibles entre sí`,
     inicio >= 0 && inicio <= 100, `empezaría en ${inicio}`);
});

ok("las tres ventanas coinciden en el score actual",
   W["24h"].score === W["7d"].score && W["7d"].score === W["30d"].score,
   "el índice de ahora es uno solo");
ok("24h delta +37", W["24h"].delta === 37, String(W["24h"]?.delta));
ok("7d delta -8", W["7d"].delta === -8, String(W["7d"]?.delta));
ok("30d delta +2", W["30d"].delta === 2, String(W["30d"]?.delta));
ok("el mood sale del score actual", W["24h"].mood === "neutral", String(W["24h"]?.mood));

console.log("\n== y SUS PROPIOS ejes: aquí estaba el bug ==");
ok("24h trae ejes", !!W["24h"].axes);
ok("7d trae ejes", !!W["7d"].axes);
ok("30d trae ejes", !!W["30d"].axes);

const a24 = W["24h"].axes, a7 = W["7d"].axes, a30 = W["30d"].axes;
ok("la agitación de 24h es máxima con +37", a24.arousal === 1, String(a24.arousal));
ok("la de 7d es menor con -8", a7.arousal < a24.arousal, `${a7.arousal} vs ${a24.arousal}`);
ok("la de 30d es la menor con +2", a30.arousal < a7.arousal, `${a30.arousal} vs ${a7.arousal}`);
ok("las tres siguen reaccionando distinto",
   new Set([a24.arousal, a7.arousal, a30.arousal]).size === 3);
ok("las tres ventanas NO comparten ejes",
   JSON.stringify(a24) !== JSON.stringify(a7) && JSON.stringify(a7) !== JSON.stringify(a30));
/* El valence ya NO se diferencia entre ventanas: sale del score
   actual, que es el mismo para las tres. Lo que las diferencia es
   la agitación y la tensión, que sí son propias del periodo. */
ok("el valence es el mismo en las tres, porque el score lo es",
   a24.valence === a7.valence && a7.valence === a30.valence);
ok("la tensión sale de la volatilidad de la ventana",
   a24.tension > a30.tension, `${a24.tension} vs ${a30.tension}`);

console.log("\n== lo de antes sigue igual ==");
ok("score canónico intacto", res.body.score === 38);
ok("delta de una hora intacto", res.body.delta === -6, String(res.body.delta));
ok("axes del momento siguen ahí", !!res.body.axes);
ok("una sola consulta para las tres ventanas",
   __state.queries.filter((q) => q.includes("VALUES")).length === 1);
ok("cache-control puesto", /s-maxage=60/.test(res.headers["Cache-Control"] || ""));

console.log("\n== sin lecturas con índice ==");
__state.rows.latest = [];
res = await run();
ok("avisa en vez de inventar", res.body.ok === false && res.body.error === "no_index_yet");

console.log("\n== el rig usa las ventanas ==");
if (existsSync(rigPath)) {
  const R = readFileSync(rigPath, "utf-8");
  ok("hay una función única que aplica la ventana", /function applyWindow\(\)/.test(R));
  ok("los ejes de la ventana mandan sobre los del momento",
     /w\?\.axes\s*\|\|\s*state\.momentAxes/.test(R));
  ok("los ejes del momento se guardan como respaldo", /state\.momentAxes\s*=/.test(R));
  ok("se acabó el trinquete de Math.max sobre arousal",
     !/target\.arousal\s*=\s*Math\.max/.test(R));
  ok("setRange recoloca los ejes sin esperar a la red",
     /function setRange[\s\S]{0,900}applyWindow\(\)/.test(R));
  ok("ya no se asignan los ejes del momento a ciegas",
     !/Object\.assign\(target,\s*data\.axes/.test(R));

  console.log("\n== un solo delta en pantalla ==");
  ok("la pastilla del rango tiene función propia", /function updateRangeTag\(\)/.test(R));
  ok("la pastilla usa windowDelta, el mismo del subtítulo",
     /updateRangeTag[\s\S]{0,600}state\.windowDelta/.test(R));
  ok("la pastilla ya NO resta la columna vieja `.score`",
     !/const first = Number\(pts\[0\]\?\.score\)/.test(R));
  ok("el respaldo de la pastilla usa pointIndex",
     /updateRangeTag[\s\S]{0,900}pointIndex\(pts\[0\]\)/.test(R));
  ok("se repinta al llegar el índice, no solo al cargar el histórico",
     (R.match(/updateRangeTag\(\)/g) || []).length >= 3,
     `${(R.match(/updateRangeTag\(\)/g) || []).length} llamadas`);

  console.log("\n== la curva se pinta con el color de la emoción ==");
  ok("hay degradado de trazo por emoción", /heroHistoryStroke/.test(R));
  ok("el color sale de la misma tabla MOODS", /moodFor\(clamp\(v, 0, 100\)\)\[3\]/.test(R));
  ok("el color sale del mismo pointIndex que la cara",
     /paintHistoryColors[\s\S]{0,900}pointIndex\(pts\[i\]\)/.test(R));
  ok("las paradas del degradado están acotadas", /GRAD_STOPS\s*=\s*\d+/.test(R));
  ok("los nodos del degradado se reutilizan, no se recrean",
     /while \(grad\.childNodes\.length/.test(R));

  console.log("\n== higiene ==");
  const idle = (R.match(/ensureIdle\(mood\[0\]\);/g) || []).length;
  ok("ensureIdle no está duplicado dentro de enforceCanonical", idle === 1, `${idle} llamadas`);
} else {
  console.log("  (hero-rig.js no encontrado; se omiten estas comprobaciones)");
}

console.log(`\n${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);
