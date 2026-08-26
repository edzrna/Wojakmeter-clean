/* ===========================================================
   MARKET INDEX — el numero canonico

   UNA SOLA FUENTE. Hoy la formula del score vive duplicada en
   script.js, history-snapshot.js y global.js, y ya se ha
   desincronizado una vez. Este modulo es el unico sitio donde se
   calcula: los endpoints lo importan y el navegador solo lee el
   resultado.

   DOS DECISIONES DE FONDO:

   1) NORMALIZACION ADAPTATIVA, MAPEO FINAL FIJO.
      Cada componente se mide contra SU PROPIA historia de 90 dias
      (z-score), porque un -2% no significa lo mismo en un mercado
      tranquilo que en uno convulso. Pero el compuesto pasa por una
      curva FIJA, para que un 78 de hoy sea comparable con un 78 de
      marzo. Con percentil puro, cualquier rebote de un mercado
      bajista largo daria Euforia, y el historico dejaria de
      significar nada.

   2) LOS COMPONENTES TIENEN QUE MEDIR COSAS DISTINTAS.
      El motor anterior era cambio de precio (0.70) + trending
      (0.18) + memes (0.12), pero trending y memes se calculan del
      cambio de precio de esas monedas. Eran el mismo dato tres
      veces: un indicador de precio disfrazado de indice compuesto.

   Este modulo NO decide como se ve el personaje. Eso es
   presentacion y vive en los perfiles. Aqui solo esta la medicion.
   =========================================================== */

/* ---------------------------------------------------------
   PESOS

   Suman 1. El retorno pesa mas que nada porque es lo que la gente
   mira, pero por debajo del 50%: si domina, volvemos a tener un
   indicador de precio.

   La amplitud es la incorporacion importante y la unica senal que
   distingue un rally real de que Bitcoin arrastre la media.
   --------------------------------------------------------- */
export const WEIGHTS = {
  return_: 0.30,   // direccion
  breadth: 0.22,   // cuantas suben, no cuanto sube la media
  volRegime: 0.15, // miedo, con el signo del retorno
  volumeAnom: 0.13,// conviccion
  dominance: 0.10, // apetito de riesgo
  headlines: 0.10  // la unica no derivada del precio
};

const LOOKBACK_DAYS = 90;
const Z_CLAMP = 3;          // recorte: un dia loco no desquicia la escala
const MIN_SAMPLES = 20;     // por debajo, el z-score es ruido

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function tanh(x) {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

/* ---------------------------------------------------------
   Z-SCORE ROBUSTO

   Mediana y MAD en vez de media y desviacion tipica. En cripto,
   un solo dia de -30% infla la desviacion lo suficiente para que
   las semanas siguientes parezcan planas; la mediana no se mueve
   por un valor extremo.

   El 1.4826 convierte la MAD en un equivalente de desviacion
   tipica para una distribucion normal, que es lo que hace que los
   umbrales de z sigan siendo interpretables.
   --------------------------------------------------------- */
export function robustZ(series, value) {
  const xs = (series || []).map(Number).filter(Number.isFinite);
  if (xs.length < MIN_SAMPLES) return null;   // null = "no medido"

  const sorted = [...xs].sort((a, b) => a - b);
  const med = median(sorted);
  const mad = median(sorted.map((x) => Math.abs(x - med)).sort((a, b) => a - b));

  const scale = mad * 1.4826;
  /* Serie completamente plana: cualquier desviacion seria infinita.
     Se devuelve 0 en vez de dividir por cero. */
  if (!(scale > 1e-9)) return 0;

  return clamp((Number(value) - med) / scale, -Z_CLAMP, Z_CLAMP);
}

function median(sortedArr) {
  const n = sortedArr.length;
  if (!n) return 0;
  const mid = n >> 1;
  return n % 2 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

/* ---------------------------------------------------------
   AMPLITUD

   La fraccion de monedas en verde, centrada en cero. +1 = todas
   suben, -1 = todas bajan.

   No lleva z-score: ya es una proporcion acotada y comparable
   entre epocas por construccion. Pasarla por z-score la haria
   relativa a lo normal del trimestre, que es justo lo que no
   queremos de esta senal —"18 de 20 en verde" significa lo mismo
   siempre.
   --------------------------------------------------------- */
/* Las stablecoins NO opinan. USDT y USDC se mueven entre -0,02% y
   +0,02% por ruido de mercado, y con el criterio "> 0" caen a un
   lado u otro a cara o cruz. En un top 20 son dos monedas: hasta un
   10% de la amplitud decidida por redondeo. Fuera. */
const STABLES = new Set([
  "tether", "usd-coin", "dai", "first-digital-usd", "true-usd",
  "paypal-usd", "usdd", "frax", "usde", "ethena-usde",
  "binance-usd", "gemini-dollar", "pax-dollar"
]);

const STABLE_SYMBOLS = new Set([
  "usdt", "usdc", "dai", "fdusd", "tusd", "pyusd", "usdd",
  "frax", "usde", "busd", "gusd", "usdp"
]);

function isStable(coin) {
  const id = String(coin?.id || "").toLowerCase();
  const sym = String(coin?.symbol || "").toLowerCase();
  return STABLES.has(id) || STABLE_SYMBOLS.has(sym);
}

export function computeBreadth(coins) {
  const list = (coins || [])
    .filter((c) => !isStable(c))
    .filter((c) => Number.isFinite(
      Number(c?.price_change_percentage_24h_in_currency ?? c?.change)
    ));
  if (list.length < 5) return null;

  const up = list.filter((c) =>
    Number(c.price_change_percentage_24h_in_currency ?? c.change) > 0).length;

  return (up / list.length) * 2 - 1;
}

/* ---------------------------------------------------------
   EL INDICE

   `now`     — las mediciones crudas de este momento
   `history` — arrays de las mismas mediciones, ultimos 90 dias

   Devuelve el score, el desglose y que componentes no se pudieron
   medir. Lo ultimo importa: un indice al que le faltan tres
   senales deberia decirlo, no fingir que las tenia.
   --------------------------------------------------------- */
export function computeIndex(now, history = {}) {
  const parts = {};
  const missing = [];

  /* 1. RETORNO */
  parts.return_ = signed(robustZ(history.change, now.change));

  /* 2. AMPLITUD */
  const breadth = Number.isFinite(now.breadth) ? now.breadth : null;
  parts.breadth = breadth === null ? null : clamp(breadth, -1, 1);

  /* ===========================================================
     LA DIRECCION SE PRESTA CON SU FUERZA, NO CON UN SIGNO.

     ARREGLADO: aqui habia `Math.sign(now.change)`, que vale -1
     tanto para un dia de -0,5% como para uno de -12%. La
     volatilidad y el volumen suman 0,28 del peso total, asi que
     CUALQUIER dia que cerrara en rojo, por poco que fuera, metia
     ese 0,28 al maximo negativo de golpe. Con la amplitud tirando
     tambien hacia abajo, medio indice se iba al suelo por un -0,6%.

     Ese era el motivo de "miedo extremo, indice 15" con el mercado
     bajando medio punto.

     Ahora la direccion es `parts.return_`, que ya es el retorno
     normalizado y acotado a -1..1. Un dia plano deja estas dos
     senales casi mudas; un desplome las pone a tope. Que es lo que
     siempre quiso decir el comentario de abajo: la volatilidad
     EMPEORA una caida, no la crea.
     =========================================================== */
  const dir = Number.isFinite(parts.return_) ? parts.return_ : 0;

  /* 3. REGIMEN DE VOLATILIDAD
     La volatilidad no tiene signo propio: subir un 8% y caer un 8%
     son igual de volatiles. Toma la direccion del retorno, con su
     fuerza, asi que volatilidad alta empeora una caida y exagera un
     rally, en proporcion a lo grande que sea el movimiento. */
  const volZ = robustZ(history.volatility, now.volatility);
  parts.volRegime = volZ === null ? null
    : clamp(volZ / Z_CLAMP, -1, 1) * dir;

  /* 4. ANOMALIA DE VOLUMEN
     Mismo criterio: el volumen mide conviccion, no direccion. */
  const volumeZ = robustZ(history.volume, now.volume);
  parts.volumeAnom = volumeZ === null ? null
    : clamp(volumeZ / Z_CLAMP, -1, 1) * dir;

  /* 5. ROTACION DE DOMINANCIA
     La dominancia de BTC bajando significa dinero entrando en
     alts: apetito de riesgo. Por eso va con signo invertido. */
  const domZ = robustZ(history.dominance, now.dominance);
  parts.dominance = domZ === null ? null : -clamp(domZ / Z_CLAMP, -1, 1);

  /* 6. TITULARES
     Llega como 0..100 desde /api/sentiment y se centra en cero. La
     unica senal que no se deriva del precio, y por eso se queda
     aunque su peso sea bajo. */
  parts.headlines = Number.isFinite(now.headlines)
    ? clamp((now.headlines - 50) / 50, -1, 1) : null;

  /* ---- Compuesto con renormalizacion ----
     Si falta un componente, su peso se reparte entre los demas en
     vez de contarlo como cero. Contar como cero es afirmar que esa
     senal estaba neutra, que es distinto de no haberla medido. */
  let sum = 0, wsum = 0;
  for (const key of Object.keys(WEIGHTS)) {
    const v = parts[key];
    if (v === null || !Number.isFinite(v)) { missing.push(key); continue; }
    sum  += v * WEIGHTS[key];
    wsum += WEIGHTS[key];
  }

  /* Sin ninguna senal no se inventa un 50: se declara. */
  if (wsum < 0.35) {
    return { score: null, parts, missing, confidence: 0, raw: 0 };
  }

  const raw = sum / wsum;          // -1..1
  const score = Math.round(clamp(50 + 50 * tanh(raw * 1.35), 0, 100));

  return {
    score,
    raw,
    parts,
    missing,
    /* Cuanto peso se pudo medir de verdad. La interfaz puede
       atenuar el numero cuando esto baja. */
    confidence: Number(wsum.toFixed(2))
  };
}

function signed(z) {
  return z === null ? null : clamp(z / Z_CLAMP, -1, 1);
}

export function moodFromScore(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

export const INDEX_LOOKBACK_DAYS = LOOKBACK_DAYS;
