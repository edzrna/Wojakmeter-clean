/* ===========================================================
   ARNÉS DEL ÍNDICE CANÓNICO — script.js

   Uso:  node smoke-index.mjs [ruta/a/script.js]

   Por qué existe: `node --check` valida sintaxis. No dice si
   `getEffectiveHeroScore` devuelve el índice, ni si la curva de
   detrás del personaje sale de la misma columna que el número,
   ni si al pulsar una pill se recarga la ventana correcta. Todo
   eso es precisamente lo que llevaba seis turnos arreglándose
   pieza a pieza.

   Cómo funciona: carga script.js en un contexto `vm` con un DOM
   mínimo y `readyState = "loading"`, para que registre su
   listener de arranque y NO lo ejecute. Después inyecta estados
   de `historyData` y llama a las funciones directamente. No toca
   red ni base de datos.
   =========================================================== */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const target = resolve(process.argv[2] || "public/script.js");
if (!existsSync(target)) {
  console.error(`No encuentro ${target}\nUso: node smoke-index.mjs [ruta/a/script.js]`);
  process.exit(2);
}

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); }
};

/* ---------- DOM mínimo ---------- */
function makeEl(id = "") {
  const el = {
    id, tagName: "DIV", textContent: "", innerHTML: "", value: "",
    style: { setProperty: () => {}, removeProperty: () => {}, getPropertyValue: () => "" },
    dataset: {}, children: [], disabled: false,
    classes: new Set(),
    classList: {
      add:    (...c) => c.forEach((x) => el.classes.add(x)),
      remove: (...c) => c.forEach((x) => el.classes.delete(x)),
      toggle: (c, on) => { if (on === undefined) { el.classes.has(c) ? el.classes.delete(c) : el.classes.add(c); } else if (on) el.classes.add(c); else el.classes.delete(c); },
      contains: (c) => el.classes.has(c)
    },
    getAttribute: () => null,
    setAttribute: () => {},
    removeAttribute: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: (c) => { el.children.push(c); return c; },
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    getBoundingClientRect: () => ({ width: 900, height: 300, top: 0, left: 0, right: 900, bottom: 300 }),
    focus: () => {}, blur: () => {}, remove: () => {}
  };
  Object.defineProperty(el, "className", {
    get: () => [...el.classes].join(" "),
    set: (v) => { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  });
  return el;
}

const els = new Map();
const byId = (id) => {
  if (!els.has(id)) els.set(id, makeEl(id));
  return els.get(id);
};

const doc = {
  readyState: "loading",
  documentElement: makeEl("html"),
  body: makeEl("body"),
  head: makeEl("head"),
  getElementById: (id) => (els.has(id) ? els.get(id) : null),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  createElementNS: () => makeEl(),
  addEventListener: () => {},
  removeEventListener: () => {},
  hidden: false
};

const sandbox = {
  console,
  document: doc,
  navigator: { userAgent: "node", clipboard: { writeText: async () => {} } },
  location: { href: "https://wojakmeter.com/", search: "", hostname: "wojakmeter.com" },
  localStorage: {
    _m: new Map(),
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
    setItem(k, v) { this._m.set(k, String(v)); },
    removeItem(k) { this._m.delete(k); }
  },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: clearTimeout,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  Intl, Math, Date, JSON, URL, URLSearchParams, TextEncoder, TextDecoder, crypto
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.removeEventListener = () => {};
sandbox.window.dispatchEvent = (e) => { sandbox.__events.push(e); return true; };
sandbox.__events = [];
sandbox.matchMedia = () => ({ matches: false, addEventListener: () => {}, addListener: () => {} });
sandbox.EventSource = class { constructor() {} close() {} addEventListener() {} };

const ctx = vm.createContext(sandbox);
const code = readFileSync(target, "utf-8");

try {
  new vm.Script(code, { filename: "script.js" }).runInContext(ctx);
} catch (e) {
  console.error("\nscript.js reventó al cargarse:\n", e);
  process.exit(1);
}

/* Evalúa una expresión DENTRO del contexto: así se llega a los
   `let`/`const` de nivel superior, que no cuelgan de window. */
const ev = (expr) => vm.runInContext(`(${expr})`, ctx);
const run = (stmt) => vm.runInContext(stmt, ctx);

console.log("\n== el archivo carga sin ejecutar boot ==");
ok("no lanzó al evaluarse", true);
ok("getEffectiveHeroScore existe", ev("typeof getEffectiveHeroScore") === "function");
ok("getCanonicalIndexScore existe", ev("typeof getCanonicalIndexScore") === "function");
ok("historyWindowUsesIndex existe", ev("typeof historyWindowUsesIndex") === "function");
ok("historyPointValue existe", ev("typeof historyPointValue") === "function");
ok("hideHeroModeControls existe", ev("typeof hideHeroModeControls") === "function");
ok("isLoadingHistory ya no existe", ev("typeof isLoadingHistory") === "undefined");
ok("pills = 24h/7d/30d", ev("JSON.stringify(HERO_ALLOWED_TIMEFRAMES)") === '["24h","7d","30d"]',
   ev("JSON.stringify(HERO_ALLOWED_TIMEFRAMES)"));
ok("toda pill tiene ventana de histórico",
   ev("HERO_ALLOWED_TIMEFRAMES.every((t) => HISTORY_RANGES.includes(t))"));

/* Construye un historyData sintético. `covered` = cuántos de los
   `n` puntos traen index_score. */
function setHistory({ n = 40, covered = 40, avgIndex = 72, oldScore = 41, indexValue = 72 } = {}) {
  const series = Array.from({ length: n }, (_, i) => ({
    ts: Date.UTC(2026, 7, 19) + i * 3600000,
    score: oldScore,
    low: oldScore - 2,
    high: oldScore + 2,
    index_score: i < covered ? indexValue : null,
    indexScore:  i < covered ? indexValue : null,
    index_mood:  i < covered ? "content" : null,
    mood: "doubt",
    change: 0.5
  }));

  run(`historyData = ${JSON.stringify({
    ok: true,
    hasIndex: covered > 0,
    series,
    stats: {
      current: { score: oldScore, indexScore: indexValue, mood: "doubt" },
      min: oldScore - 6, max: oldScore + 6, avg: oldScore,
      samples: n,
      minIndex: indexValue - 4, maxIndex: indexValue + 4,
      avgIndex, indexSamples: covered,
      streakSeconds: 100000, distribution: [{ mood: "doubt", pct: 100 }]
    }
  })};`);
}

console.log("\n== cobertura completa: manda el índice ==");
setHistory({ n: 40, covered: 40, avgIndex: 72, oldScore: 41 });
run("currentMarketScore = 41; heroMode = HERO_MODE_RAW;");
ok("historyWindowUsesIndex true", ev("historyWindowUsesIndex()") === true);
ok("canónico = avgIndex", ev("getCanonicalIndexScore()") === 72, String(ev("getCanonicalIndexScore()")));
ok("getEffectiveHeroScore devuelve el índice, no el viejo",
   ev("getEffectiveHeroScore()") === 72, String(ev("getEffectiveHeroScore()")));

/* El punto entero de todo esto: la cifra NO cambia con el modo. */
run("heroMode = HERO_MODE_COMPOSITE;");
ok("COMPOSITE da el mismo número", ev("getEffectiveHeroScore()") === 72, String(ev("getEffectiveHeroScore()")));
run("heroMode = HERO_MODE_CUSTOM; activeLayers = { market: true, social: true, driver: true, pulse: true };");
ok("CUSTOM da el mismo número", ev("getEffectiveHeroScore()") === 72, String(ev("getEffectiveHeroScore()")));
run("heroMode = HERO_MODE_RAW;");

ok("el mood sale del índice, no del score viejo",
   ev("getMoodByScore(getEffectiveHeroScore()).key") === "content",
   ev("getMoodByScore(getEffectiveHeroScore()).key"));

console.log("\n== la curva usa la MISMA columna que el número ==");
run("byId = (id) => document.getElementById(id);"); // no-op si ya existe
["heroTimelineBackdrop", "heroTimelineLine", "heroTimelineArea", "heroTimelineMid"].forEach(byId);
run("buildHeroTimeline([]);");
const lineD = els.get("heroTimelineLine").__d;
ok("historyPointValue(useIndex=true) lee index_score",
   ev("historyPointValue({ score: 41, index_score: 72 }, true)") === 72);
ok("historyPointValue(useIndex=false) lee score",
   ev("historyPointValue({ score: 41, index_score: 72 }, false)") === 41);
ok("punto sin índice devuelve null en modo índice",
   ev("historyPointValue({ score: 41, index_score: null }, true)") === null);

console.log("\n== cobertura parcial: manda el viejo en TODO ==");
setHistory({ n: 40, covered: 20, avgIndex: 72, oldScore: 41 });
ok("historyWindowUsesIndex false al 50%", ev("historyWindowUsesIndex()") === false);
ok("canónico null al 50%", ev("getCanonicalIndexScore()") === null);
ok("cae a la fórmula vieja", ev("getEffectiveHeroScore()") === 41, String(ev("getEffectiveHeroScore()")));

setHistory({ n: 40, covered: 34, avgIndex: 72, oldScore: 41 });
ok("85% de cobertura sí usa el índice", ev("historyWindowUsesIndex()") === true);

console.log("\n== pocas muestras: no se fía ==");
setHistory({ n: 4, covered: 3, avgIndex: 72, oldScore: 41 });
ok("3 muestras indexadas no bastan", ev("historyWindowUsesIndex()") === false);
setHistory({ n: 5, covered: 5, avgIndex: 72, oldScore: 41 });
ok("5 de 5 sí bastan", ev("historyWindowUsesIndex()") === true);

console.log("\n== sin histórico ==");
run("historyData = null;");
ok("no revienta sin datos", ev("getCanonicalIndexScore()") === null);
run("currentMarketScore = 41; heroMode = HERO_MODE_RAW;");
ok("sigue dando el score viejo", ev("getEffectiveHeroScore()") === 41);

console.log("\n== endpoint viejo: serie con índice pero sin avgIndex ==");
setHistory({ n: 20, covered: 20, avgIndex: 72, oldScore: 41, indexValue: 66 });
run("delete historyData.stats.avgIndex;");
ok("media calculada a mano desde la serie", ev("getCanonicalIndexScore()") === 66,
   String(ev("getCanonicalIndexScore()")));

console.log("\n== recomputeHeroSystem publica la cifra ==");
setHistory({ n: 40, covered: 40, avgIndex: 68, oldScore: 41, indexValue: 68 });
sandbox.__events.length = 0;
try {
  run("recomputeHeroSystem();");
  ok("recomputeHeroSystem corre sin lanzar", true);
} catch (e) {
  ok("recomputeHeroSystem corre sin lanzar", false, e.message);
}
ok("currentGlobalScore = índice", ev("currentGlobalScore") === 68, String(ev("currentGlobalScore")));
ok("window.WM_CANONICAL_SCORE publicado", sandbox.WM_CANONICAL_SCORE === 68, String(sandbox.WM_CANONICAL_SCORE));
ok("evento wm:score emitido", sandbox.__events.some((e) => e.type === "wm:score"));
const ev0 = sandbox.__events.find((e) => e.type === "wm:score");
ok("el evento dice que viene del índice", ev0?.detail?.fromIndex === true);

console.log("\n== la vista previa del Pulse sigue mandando ==");
run("isPulsePreviewActive = true; currentGlobalScore = 12; recomputeHeroSystem();");
ok("no pisa el score en vista previa", ev("currentGlobalScore") === 12, String(ev("currentGlobalScore")));
run("isPulsePreviewActive = false;");

console.log("\n== modos y capas fuera de la UI ==");
["heroModes", "layerButtons", "wmLayers"].forEach(byId);
run("heroMode = HERO_MODE_CUSTOM; hideHeroModeControls();");
ok("heroMode forzado a RAW", ev("heroMode") === ev("HERO_MODE_RAW"));
ok("#heroModes oculto", els.get("heroModes").classList.contains("hidden"));
ok("#layerButtons oculto", els.get("layerButtons").classList.contains("hidden"));
ok("#wmLayers oculto", els.get("wmLayers").classList.contains("hidden"));
ok("computeCompositeScore sigue existiendo (respaldo, no huérfana)",
   ev("typeof computeCompositeScore") === "function");
ok("computeCustomLayersScore sigue existiendo",
   ev("typeof computeCustomLayersScore") === "function");

console.log("\n== loadHistory: token de petición ==");
ok("historyRequestToken existe", ev("typeof historyRequestToken") === "number");
ok("loadHistory es async", ev("loadHistory.constructor.name") === "AsyncFunction");

console.log(`\n${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);
