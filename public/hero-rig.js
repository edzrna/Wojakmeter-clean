/* ===========================================================
   HERO RIG — el personaje, vivo

   Lee /api/index-score y traduce los cuatro ejes en movimiento.

   POR QUE ES UN ARCHIVO APARTE, COMO EL JUEGO:
   script.js pasa de 7.000 lineas y ya perdimos funciones dentro
   al reescribir bloques. Este modulo no toca ni una variable de
   script.js: solo escribe propiedades CSS sobre el escenario del
   heroe y añade clases de evento. Si se borra, la pagina vuelve
   exactamente a como estaba.

   COMO CONVIVE CON script.js SIN PELEARSE:

   1. script.js hace `heroFaceWrap.className = "hero-face-wrap"` en
      cada actualizacion, asi que cualquier clase que pusieramos
      ahi se borraria. Por eso las clases de evento van en el
      ESCENARIO, que script.js solo toca con classList.remove de
      sus propias `wm-shift-*`.

   2. Las animaciones existentes usan `transform`. Este rig usa las
      propiedades individuales `translate`, `rotate` y `scale`, que
      el navegador compone con el transform en vez de sustituirlo.
      Sin eso, la respiracion mataria el `anim-float` que ya tienes.

   3. Todo el movimiento sale de variables CSS. El JS no escribe ni
      un estilo inline: escribe numeros, y el CSS decide que hacer
      con ellos.
   =========================================================== */

(function () {
  "use strict";

  const REFRESH_MS = 60000;

  /* Un salto de mas de 8 puntos en una hora es un acontecimiento.
     Por debajo es ruido: el indice se mueve solo con el goteo
     normal del mercado y una sacudida cada dos minutos deja de
     ser una sacudida. */
  const SHOCK_DELTA = 8;
  const SHOCK_MS = 2600;

  /* Por encima o por debajo de esto, el personaje se queda en modo
     exagerado mientras dure, no solo un golpe. */
  const EXTREME_HIGH = 90;
  const EXTREME_LOW  = 10;

  const PROFILE_KEY = "wmHeroProfile";
  const VIEW_KEY = "wmHeroView";

  /* Las pills del hero mandan sobre la curva de detras.

     El endpoint /api/history solo tiene 24h/7d/30d/90d, asi que
     1h y 4h se sirven pidiendo 24h y recortando en el cliente por
     tiempo real: con el cron de 15 minutos, 1h son ~4 lecturas y
     4h son ~16. Pocas, pero son las que hay — inventar una curva
     mas suave seria dibujar datos que no existen. */
  /* 1H y 4H se retiraron: con el cron de 15 minutos eran 4 y 16
     lecturas — ruido con forma de curva. */
  const TF = {
    "24h": { fetch: "24h", label: "24H", days: 1 },
    "7d":  { fetch: "7d",  label: "7D",  days: 7 },
    "30d": { fetch: "30d", label: "30D", days: 30 }
  };

  /* EL ESTILO ACTIVO manda en las dos rutas.

     Antes estaban clavadas a "classic": al elegir Synth en el
     selector, la imagen plana cambiaba —la gestiona script.js—
     pero el bucle animado seguia siendo el de classic, asi que se
     veia un robot que al cargar el sprite se convertia en una
     persona. Los dos tienen que salir del mismo estilo.

     Se lee del selector en cada llamada y no se cachea: el usuario
     puede cambiarlo en cualquier momento. */
  function heroStyle() {
    const v = String(document.getElementById("styleSelector")?.value || "")
      .toLowerCase();
    return "classic";
  }

  const HERO_IMG = (mood) => `/assets/hero/classic/${mood}.png`;

  function subemotionFor(moodKey, score, axes, windowDelta) {
    const { arousal: a, tension: x, fatigue: f } = axes;

    if (moodKey === "frustration") {
      if (a >= 0.6)  return "frustration_panic";
      if (score <= 10) return "frustration_capitulation";
      if (f >= 0.45) return "frustration_exhaustion";
    }
    if (moodKey === "concern") {
      if (a >= 0.55) return "concern_fear_spike";
      if (x >= 0.5)  return "concern_breakdown";
      return "concern_pressure";
    }
    if (moodKey === "doubt") {
      if (x >= 0.5)  return "doubt_confusion";
      if (windowDelta > 0 && x >= 0.3) return "doubt_fake_recovery";
      return "doubt_hesitation";
    }
    if (moodKey === "neutral") {
      if (x >= 0.45) return "neutral_pressure_building";
      if (f >= 0.5)  return "neutral_compression";
      return "neutral_waiting";
    }
    if (moodKey === "optimism") {
      if (windowDelta > 3 && a >= 0.4) return "optimism_building";
      if (score >= 64 && x < 0.3)      return "optimism_confident";
      if (windowDelta < 0)             return "optimism_pullback";
    }
    if (moodKey === "content") {
      if (score >= 80 && a >= 0.45) return "content_overextended";
      if (x < 0.25)                 return "content_confidence";
      return "content_strength";
    }
    if (moodKey === "euphoria") {
      if (score >= 92 && a >= 0.45) return "euphoria_overheat";
      if (x >= 0.4)                 return "euphoria_weakening";
      return "euphoria_breakout";
    }
    return moodKey;
  }

  /* Narrativas por subemocion — mismo catalogo que script.js.
     Duplicacion consciente: el rig no puede leer la const de un
     script clasico. Si se cambia alla, cambiar aqui. */
  const NARR = {
    frustration: "The market feels exhausted after heavy emotional pressure.",
    frustration_capitulation: "Traders are giving up faster than price is stabilizing.",
    frustration_panic: "Panic selling is dominating the emotional flow.",
    frustration_exhaustion: "Fear may be reaching emotional exhaustion.",
    concern: "Fear is spreading through the market.",
    concern_pressure: "Defensive pressure is building across the market.",
    concern_fear_spike: "Fear is accelerating faster than price decline.",
    concern_breakdown: "Confidence is breaking down under heavy pressure.",
    doubt: "The market is unsure and hesitation is spreading.",
    doubt_confusion: "Mixed signals are creating emotional confusion.",
    doubt_hesitation: "Traders are waiting before committing direction.",
    doubt_fake_recovery: "The bounce feels weak and emotionally fragile.",
    neutral: "No strong conviction in either direction.",
    neutral_pressure_building: "Pressure is building under a calm surface.",
    neutral_compression: "Low volume, tight range — a move is loading.",
    neutral_waiting: "The market is waiting for a reason to move.",
    optimism: "Buyers are starting to step in.",
    optimism_building: "Momentum is building behind the buyers.",
    optimism_confident: "Buyers are in control and holding ground.",
    optimism_pullback: "The uptrend is catching its breath.",
    content: "Steady climb with support underneath.",
    content_strength: "The trend is strong and orderly.",
    content_confidence: "Broad confidence across the market.",
    content_overextended: "Strong, but stretching — watch the pace.",
    euphoria: "Extreme greed territory.",
    euphoria_breakout: "Everything is green and accelerating.",
    euphoria_overheat: "Overheated. Historically, this is the risk zone.",
    euphoria_weakening: "Still euphoric, but the fuel is thinning."
  };

  /* El subtitulo lleva la narrativa Y los datos que la sostienen:
     "frases genericas" era el sintoma de un texto sin numeros. */
  function buildSubtitle(sub, moodKey) {
    const base = NARR[sub] || NARR[moodKey] || "";
    const tf = TF[state.range] || TF["24h"];
    const d = state.windowDelta;
    const bits = [];

    if (Number.isFinite(d) && d !== 0) {
      bits.push(`Index ${d > 0 ? "up" : "down"} ${Math.abs(d)} over ${tf.label}`);
    }
    const days = Math.floor(state.streakSeconds / 86400);
    if (days >= 2) bits.push(`${days} days in this zone`);

    return bits.length ? `${base} ${bits.join(" · ")}.` : base;
  }

  const MOODS = [
    ["frustration", 0, 19, "#E4485C"], ["concern", 20, 34, "#E8848F"],
    ["doubt", 35, 44, "#E8B4BA"],      ["neutral", 45, 59, "#B8C0CB"],
    ["optimism", 60, 69, "#A8E6BF"],   ["content", 70, 84, "#7FD9A0"],
    ["euphoria", 85, 100, "#3BD97A"]
  ];
  const moodFor = (s) => (MOODS.find(([, lo, hi]) => s >= lo && s <= hi) || MOODS[3]);

  const state = {
    axes: { valence: 0, arousal: 0, tension: 0, fatigue: 0 },
    score: null,
    mood: null,
    expressive: null,
    profile: "straight",
    lastMood: null,
    timer: null,
    rafId: null,
    shockUntil: 0,
    streakSeconds: 0,

    /* Vista integrada */
    view: "both",
    range: "24h",
    /* Ciclo completo del sprite en ms (ida + vuelta). Declarado
       aqui con un valor sensato: si el avance de fotograma corre
       antes de la primera lectura del indice, sin esto dependeria
       de un respaldo implicito. */
    idleDur: 6000,
    momentAxes: null,
    windowScore: null,
    windows: null,
    windowDelta: 0,
    history: [],
    scrubbing: false,
    scrubIndex: null
  };

  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function stage() {
    return $("heroStage")
      || document.querySelector(".wojak-stage")
      || $("heroFaceWrap")?.parentElement
      || null;
  }

  /* ---------------------------------------------------------
     LAS VARIABLES

     Se escriben en el escenario y no en :root a proposito: asi el
     rig no puede afectar por accidente a ningun otro modulo que
     use nombres parecidos, y el heroe del juego —que tiene su
     propio ciclo— queda fuera.
     --------------------------------------------------------- */
  function writeAxes() {
    const el = stage();
    if (!el) return;

    const { valence, arousal, tension, fatigue } = state.axes;

    el.style.setProperty("--wm-valence", valence.toFixed(3));
    el.style.setProperty("--wm-arousal", arousal.toFixed(3));
    el.style.setProperty("--wm-tension", tension.toFixed(3));
    el.style.setProperty("--wm-fatigue", fatigue.toFixed(3));

    /* Ritmo de la respiracion en segundos. Un mercado agitado
       respira en 1,6s; uno muerto, en 6. Es la señal de vida mas
       barata que existe y la que mas se nota. */
    el.style.setProperty("--wm-breath", `${(6 - arousal * 4.4).toFixed(2)}s`);

    /* Frecuencia del parpadeo: sube con la fatiga. */
    el.style.setProperty("--wm-blink", `${(9 - fatigue * 5.5).toFixed(2)}s`);
  }

  /* ---------------------------------------------------------
     EVENTOS

     La diferencia entre estar alto y ACABAR de subir. Llevar tres
     dias en 81 no dispara nada; saltar de 60 a 81 en una hora si.
     El nivel no puede producir esa distincion porque es el mismo
     numero, y por eso la reaccion viene de la derivada.
     --------------------------------------------------------- */
  function handleEvents(data) {
    const el = stage();
    if (!el) return;

    const delta = Number(data.delta || 0);

    /* 1. SACUDIDA por movimiento brusco */
    if (Math.abs(delta) >= SHOCK_DELTA) {
      el.dataset.shockDir = delta > 0 ? "up" : "down";
      el.classList.remove("wm-shock");
      /* Reflow forzado: sin esto, dos sacudidas seguidas no
         reinician la animacion porque la clase nunca llega a
         ausentarse entre frames. */
      void el.offsetWidth;
      el.classList.add("wm-shock");

      state.shockUntil = Date.now() + SHOCK_MS;
      clearTimeout(el.__shockTimer);
      el.__shockTimer = setTimeout(() => el.classList.remove("wm-shock"), SHOCK_MS);
    }

    /* 2. TRANSICION al cambiar de emocion.

       Va aparte de la sacudida porque son cosas distintas: se
       puede cruzar de Doubt a Neutral con un movimiento pequeño
       —si estabas justo en el borde— y ese cruce merece marcarse
       aunque el delta sea de dos puntos. */
    if (state.lastMood && data.mood !== state.lastMood) {
      el.dataset.moodFrom = state.lastMood;
      el.classList.remove("wm-transition");
      void el.offsetWidth;
      el.classList.add("wm-transition");
      clearTimeout(el.__transTimer);
      el.__transTimer = setTimeout(() => el.classList.remove("wm-transition"), 1400);
    }
    state.lastMood = data.mood;

    /* 3. EXTREMO SOSTENIDO: no es un golpe, es un estado. */
    const extreme = data.score >= EXTREME_HIGH ? "high"
                  : data.score <= EXTREME_LOW ? "low" : null;
    el.classList.toggle("wm-extreme", Boolean(extreme));
    if (extreme) el.dataset.extreme = extreme;
    else delete el.dataset.extreme;
  }

  /* ---------------------------------------------------------
     INTERPOLACION

     Los ejes no saltan al valor nuevo: se acercan a el. El
     endpoint responde cada 60s y sin suavizado el personaje daria
     un tiron cada minuto, que es justo lo contrario de estar vivo.

     0,06 por frame llega al 95% en unos dos segundos: se percibe
     como que el animo cambia, no como que la imagen se actualiza.
     --------------------------------------------------------- */
  const target = { valence: 0, arousal: 0, tension: 0, fatigue: 0 };

  /* rAF pasa la marca de tiempo. Sin recibirla aqui, advanceIdle
     lanzaba un ReferenceError en CADA frame y se llevaba por
     delante enforceCanonical, que va justo despues. */
  function tick(now) {
    let moved = false;

    for (const k of Object.keys(target)) {
      const diff = target[k] - state.axes[k];
      if (Math.abs(diff) > 0.001) {
        state.axes[k] += diff * 0.06;
        moved = true;
      }
    }

    if (moved) writeAxes();

    enforceCanonical();
    state.rafId = requestAnimationFrame(tick);
  }

  /* =========================================================
     LA VISTA INTEGRADA

     El histórico se dibuja DETRÁS del personaje, en el mismo
     escenario, y se puede recorrer con el dedo o el ratón: al
     arrastrar, la cara cambia al estado que tenía el mercado ese
     día.

     POR QUÉ ASÍ Y NO COMO DOS MÓDULOS SEPARADOS:
     la cara y la curva cuentan la misma historia. Tenerlas en
     sitios distintos obliga a mirar arriba y abajo para relacionar
     "estaba en Doubt" con "y venía cayendo desde el martes". Aquí
     la relación se ve sin buscarla.

     TRES MODOS, porque los tres son legítimos: quien viene a leer
     el dato quiere la curva limpia, quien viene a mirar quiere la
     cara, y la mayoría quiere las dos.
     ========================================================= */

  function setView(mode) {
    state.view = ["chart", "both", "hero"].includes(mode) ? mode : "both";
    try { localStorage.setItem(VIEW_KEY, state.view); } catch {}

    const el = stage();
    if (el) el.dataset.view = state.view;

    document.querySelectorAll("[data-view-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.viewMode === state.view);
      b.setAttribute("aria-pressed", String(b.dataset.viewMode === state.view));
    });

    /* El histórico solo se pide si se va a ver. */
    if (state.view !== "hero" && !state.history.length) loadHistory();
  }

  async function loadHistory() {
    const tf = TF[state.range] || TF["24h"];
    try {
      const res = await fetch(`/api/history?range=${tf.fetch}`,
        { headers: { accept: "application/json" } });
      const data = await res.json();
      if (!data?.ok || !Array.isArray(data.series) || data.series.length < 2) return;

      state.history = data.series;
      drawHistory();

      /* LA VENTANA MANDA TAMBIEN EN EL PERSONAJE.

         El score que se muestra es la MEDIA del indice en la
         ventana elegida: 24H dice como se sintio el dia, 7D como
         se sintio la semana. Titulo, cara y subtitulo salen todos
         de ese mismo numero, asi que cambiar de pill cambia todo
         junto y nada se contradice: hay UNA verdad por vista, solo
         que con distinto alcance.

         (La version anterior dejaba la cara clavada en el "ahora"
         mientras la curva cambiaba de ventana — coherente sobre el
         papel, pero partia la seccion en dos mitades que no se
         hablaban.) */
      /* LA VENTANA VIENE DEL SERVIDOR.

         Antes se promediaba aquí la serie de /api/history, que no
         trae index_score: el promedio salía de la fórmula vieja o
         no salía, y entonces las tres pills mostraban el mismo
         número. Ahora /api/index-score las calcula sobre la
         columna correcta y llegan ya hechas.

         Si una ventana viene null —menos de 3 lecturas— manda el
         índice del momento. Un número peor antes que uno falso. */
      applyWindow();

      updateRangeTag();
    } catch {}
  }

  /* La MISMA serie recortada para dibujar y para recorrer: si el
     dibujo y el scrub recortaran cada uno por su lado, el dedo
     apuntaria a un dia y la pastilla mostraria otro. */
  function visibleSeries() {
    return state.history.slice(-400);
  }

  /* ---------------------------------------------------------
     EL ÍNDICE DE UN PUNTO DEL HISTÓRICO

     BUG QUE ARREGLA — y era el gordo:

     emotion_history guarda DOS columnas distintas: `score`, que es
     la fórmula vieja de script.js, e `index_score`, que es el
     índice nuevo. El rig promediaba `p.score` y lo mostraba como
     si fuera el índice.

     O sea: el héroe decía "Index" y enseñaba la media de OTRA
     medición. Podían diferir por 20 puntos sin que nada pareciera
     roto, porque las dos son cifras plausibles de 0 a 100. Ese es
     el tipo de fallo que no salta: no hay excepción, no hay hueco,
     solo un número equivocado con toda naturalidad.

     Se prefiere index_score y se cae a score solo si el punto es
     anterior al despliegue del motor nuevo, que es cuando esa
     columna está vacía.
     --------------------------------------------------------- */
  function pointIndex(p) {
    const idx = Number(p?.index_score ?? p?.indexScore);
    if (Number.isFinite(idx)) return idx;
    const legacy = Number(p?.score);
    return Number.isFinite(legacy) ? legacy : null;
  }

  /* ---------------------------------------------------------
     LA VENTANA MANDA EN LA REACCION, NO SOLO EN EL NUMERO

     Aqui estaba el fallo que hacia que las tres pills reaccionaran
     igual. Lo que gobierna la REACCION —velocidad, temblor, ladeo,
     apagado, respiracion, parpadeo— son los cuatro ejes, y los ejes
     llegaban solo del momento: cambiar de pill movia el score y
     dejaba la agitacion intacta.

     Ahora el endpoint manda ejes por ventana y se aplican aqui. Si
     una ventana no los trae —pocas lecturas, o un endpoint aun sin
     desplegar— se cae a los del momento, que es lo que habia antes.

     Y se ASIGNA, no se hace `Math.max`. Aquel maximo era un
     trinquete: la agitacion solo podia subir, asi que despues de un
     dia violento ninguna ventana mas tranquila conseguia bajarla
     hasta que recargabas la pagina.
     --------------------------------------------------------- */
  function applyWindow() {
    const w = state.windows?.[state.range];
    window.WM_CHARACTER_WINDOW = w || null;

    state.windowScore = w ? w.score : null;
    state.windowDelta = w ? w.delta : 0;

    const axes = w?.axes || state.momentAxes;
    if (axes) Object.assign(target, axes);
  }

  /* ---------------------------------------------------------
     LA PASTILLA DEL RANGO — UN SOLO DELTA

     Aqui habia DOS cifras para lo mismo. La pastilla decia "▼10"
     y el subtitulo, dos dedos mas abajo, "Index down 7 over 24H".
     Ninguna estaba mal calculada: median cosas distintas sin
     decirlo.

     La pastilla restaba el primer y el ultimo punto de la serie
     leyendo `p.score` — la columna VIEJA de emotion_history, la de
     la formula de script.js. Todo lo demas de esta seccion usa
     `index_score`. Es exactamente la trampa de las dos columnas
     que ya costo un bug largo: las dos son cifras plausibles de 0
     a 100, asi que confundirlas no da error, da una contradiccion
     creible.

     Ahora la pastilla usa `state.windowDelta`, el MISMO numero que
     el subtitulo, que viene del endpoint calculado sobre la
     columna correcta. Si esa cifra no esta —endpoint viejo, o
     ventana con pocas lecturas— se calcula de la serie con
     `pointIndex`, nunca con `.score`.
     --------------------------------------------------------- */
  function updateRangeTag() {
    const tag = $("heroRangeTag");
    if (!tag) return;

    const tf = TF[state.range] || TF["24h"];
    let d = Number(state.windowDelta);

    if (!Number.isFinite(d) || d === 0) {
      const pts = visibleSeries();
      const first = pointIndex(pts[0]);
      const last = pointIndex(pts[pts.length - 1]);
      d = (first === null || last === null) ? null : Math.round(last - first);
    }

    const arrow = d > 0 ? `▲${d}` : d < 0 ? `▼${Math.abs(d)}` : "—";
    const text = d === null
      ? `EMOTION · ${tf.label}`
      : `EMOTION · ${tf.label} · ${arrow}`;

    if (tag.textContent !== text) tag.textContent = text;
    tag.dataset.dir = d > 0 ? "up" : d < 0 ? "down" : "flat";
  }

  function setRange(range) {
    if (!TF[range] || state.range === range) return;
    state.range = range;

    /* El score de la ventana ya está en memoria: se aplica EN EL
       ACTO, sin esperar a que baje el histórico. Antes el número
       no se movía hasta que respondía la red, y con la caché fría
       eso son cientos de milisegundos en los que la pill parecía
       no hacer nada. */
    /* Los ejes se recolocan EN EL ACTO, no al volver el histórico.
       Antes solo `loadHistory` los tocaba, asi que la reaccion
       tardaba en cambiar lo que tardara la red. */
    applyWindow();
    updateRangeTag();

    if (state.score !== null) {
      window.WM_CANONICAL_INDEX = state.windowScore ?? state.score;
      publishAndRefresh();
    }

    loadHistory();
  }

  /* Escala FIJA de 0 a 100, no autoescalada al rango.

     Con autoescala, un mes plano entre 48 y 52 se convierte en una
     montaña rusa y un mes de verdad movido se ve igual de agitado.
     Con escala fija, la altura SIGNIFICA algo: arriba es eufórico
     siempre, y dos capturas de meses distintos son comparables. */
  function drawHistory() {
    const path = $("heroHistoryLine");
    const area = $("heroHistoryArea");
    if (!path || !area || state.history.length < 4) return;

    const W = 900, H = 280, PAD = 26;
    const pts = visibleSeries();
    if (pts.length < 2) return;

    const xy = pts.map((p, i) => [
      (i / (pts.length - 1)) * W,
      PAD + (1 - clamp(pointIndex(p) ?? 50, 0, 100) / 100) * (H - PAD * 2)
    ]);

    const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    path.setAttribute("d", d);
    area.setAttribute("d", `${d} L${W} ${H} L0 ${H} Z`);

    paintHistoryColors(pts);

    const mid = $("heroHistoryMid");
    if (mid) {
      const y = PAD + 0.5 * (H - PAD * 2);
      mid.setAttribute("d", `M0 ${y} L${W} ${y}`);
    }

    state.drawn = xy;
  }

  /* ---------------------------------------------------------
     LA CURVA SE PINTA DEL COLOR DE LO QUE CUENTA

     Un trazo gris del mismo tono de punta a punta obliga a leer la
     altura para saber si aquel martes fue bueno o malo. Con el
     color de la emocion en cada tramo, el mes se lee de un vistazo:
     donde se pone rojo hubo miedo y donde verdea hubo euforia, sin
     mirar el eje.

     Es un degradado horizontal con una parada por punto, no un
     trazo por tramo: un solo `path` y un `linearGradient`, en vez
     de noventa lineas sueltas que habria que crear y destruir en
     cada redibujo.

     El color sale de la MISMA tabla MOODS y del MISMO `pointIndex`
     que la cara y el numero. Si un dia el trazo y el personaje no
     coincidieran, seria que discrepan los datos, no las paletas.
     --------------------------------------------------------- */

  /* Las paradas se recortan a 48: por encima de eso el degradado no
     gana detalle visible y el SVG se llena de nodos que hay que
     reescribir en cada actualizacion. */
  const GRAD_STOPS = 48;

  function ensureGradient(id, vertical) {
    const svg = $("heroHistorySvg");
    if (!svg) return null;

    let grad = document.getElementById(id);
    if (grad) return grad;

    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.insertBefore(defs, svg.firstChild);
    }

    grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", id);
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", vertical ? "0" : "1");
    grad.setAttribute("y2", vertical ? "1" : "0");
    defs.appendChild(grad);
    return grad;
  }

  function setStops(grad, stops) {
    if (!grad) return;

    /* Se reutilizan los nodos que ya hay en vez de vaciar y volver
       a crear: esto corre en cada redibujo y crear 48 elementos SVG
       cada vez es basura que el recolector acaba pagando en un
       tiron. */
    while (grad.childNodes.length > stops.length) grad.removeChild(grad.lastChild);
    while (grad.childNodes.length < stops.length) {
      grad.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "stop"));
    }

    stops.forEach((st, i) => {
      const node = grad.childNodes[i];
      node.setAttribute("offset", `${st.offset.toFixed(2)}%`);
      node.setAttribute("stop-color", st.color);
      node.setAttribute("stop-opacity", String(st.opacity ?? 1));
    });
  }

  function paintHistoryColors(pts) {
    const path = $("heroHistoryLine");
    const area = $("heroHistoryArea");
    if (!path || pts.length < 2) return;

    const step = Math.max(1, Math.ceil(pts.length / GRAD_STOPS));
    const stops = [];

    for (let i = 0; i < pts.length; i += step) {
      const v = pointIndex(pts[i]);
      if (v === null) continue;
      stops.push({
        offset: (i / (pts.length - 1)) * 100,
        color: moodFor(clamp(v, 0, 100))[3]
      });
    }

    /* El ultimo punto siempre entra: es el estado de AHORA y es el
       que el ojo busca primero. Con el recorte por pasos se
       quedaba fuera cuando la serie no era multiplo del paso. */
    const lastV = pointIndex(pts[pts.length - 1]);
    if (lastV !== null) {
      const last = { offset: 100, color: moodFor(clamp(lastV, 0, 100))[3] };
      if (stops.length && stops[stops.length - 1].offset >= 99.9) stops[stops.length - 1] = last;
      else stops.push(last);
    }

    if (stops.length < 2) return;

    const line = ensureGradient("heroHistoryStroke", false);
    setStops(line, stops);
    /* En estilo inline porque globals.css fija `stroke: var(--bone)`
       en `#heroHistoryLine` y un atributo no le ganaria. */
    path.style.stroke = "url(#heroHistoryStroke)";
    path.style.opacity = ".9";

    /* El relleno tiñe la zona con el color del estado ACTUAL, no
       con el degradado: repetirlo abajo con transparencia
       convertia el fondo en un arcoiris y le quitaba la lectura al
       trazo, que es donde esta la informacion. */
    if (area) {
      const fill = ensureGradient("heroHistoryTint", true);
      const now = stops[stops.length - 1].color;
      setStops(fill, [
        { offset: 0,   color: now, opacity: 0.55 },
        { offset: 100, color: now, opacity: 0 }
      ]);
      area.style.fill = "url(#heroHistoryTint)";
      area.style.opacity = ".22";
    }
  }

  /* ---------------------------------------------------------
     RECORRER LOS DÍAS

     Mientras se arrastra, la cara del día se muestra en una capa
     PROPIA por encima. No se toca la imagen que gestiona
     script.js: al soltar, esa capa se desvanece y vuelve el estado
     en vivo sin que nadie haya tenido que sincronizar nada.
     --------------------------------------------------------- */
  function scrubAt(clientX) {
    const svg = $("heroHistorySvg");
    if (!svg || !state.history.length) return;

    const rect = svg.getBoundingClientRect();
    const t = clamp((clientX - rect.left) / rect.width, 0, 1);

    const pts = visibleSeries();
    const i = Math.round(t * (pts.length - 1));
    const p = pts[i];
    if (!p) return;

    state.scrubIndex = i;

    /* La cara del día que se recorre sale del MISMO índice que el
       resto: si la curva se dibuja con index_score y la pastilla
       leyera `score`, el dedo señalaría un punto y el número diría
       otra cosa. */
    const score = Math.round(pointIndex(p) ?? 50);
    const [mood, , , color] = moodFor(score);

    const face = $("heroScrubFace");
    if (face) {
      const src = HERO_IMG(mood);
      if (!face.src.endsWith(src)) face.src = src;
    }

    const marker = $("heroHistoryMarker");
    if (marker && state.drawn?.[i]) {
      marker.setAttribute("cx", state.drawn[i][0]);
      marker.setAttribute("cy", state.drawn[i][1]);
      marker.setAttribute("fill", color);
    }

    const out = $("heroScrubReadout");
    if (out) {
      const when = new Date(p.ts);
      out.innerHTML =
        `<strong>${score}</strong>` +
        `<span style="color:${color}">${mood}</span>` +
        `<span class="hero-scrub-date">${when.toLocaleDateString(undefined,
          { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>`;
    }
  }

  function startScrub(e) {
    if (state.view === "hero" || !state.history.length) return;
    state.scrubbing = true;
    stage()?.classList.add("wm-scrubbing");
    scrubAt(e.clientX);
  }

  function endScrub() {
    if (!state.scrubbing) return;
    state.scrubbing = false;
    state.scrubIndex = null;
    stage()?.classList.remove("wm-scrubbing");
  }

  /* ---------------------------------------------------------
     CARGA
     --------------------------------------------------------- */
  async function load() {
    try {
      const res = await fetch(
        `/api/index-score?profile=${encodeURIComponent(state.profile)}`,
        { headers: { accept: "application/json" } }
      );
      const data = await res.json();

      /* Mientras el cron no haya guardado ninguna lectura con el
         indice nuevo, el rig se queda quieto en vez de inventar
         ejes. El personaje sigue funcionando con lo de siempre. */
      if (!data?.ok) {
        stage()?.classList.add("wm-rig-idle");
        return;
      }

      stage()?.classList.remove("wm-rig-idle");

      /* ── SE PUBLICA EL INDICE ──

         script.js lo lee en getEffectiveHeroScore() y lo reparte
         por toda la pagina. Es lo que sustituye a interceptar once
         elementos uno por uno: ahora el numero correcto sale del
         origen y no hay nada que corregir despues. */
      window.WM_CANONICAL_INDEX = data.score;
      window.WM_MARKET_SNAPSHOT = data;

      state.score = data.score;
      state.streakSeconds = Number(data.streakSeconds || 0);
      state.windows = data.windows || null;

      /* Se aplica AQUÍ, no solo al recargar el histórico.

         Antes dependía de loadHistory(), que puede no haber
         corrido todavía en la primera carga: el héroe arrancaba
         con el índice del momento y solo pasaba a la ventana
         cuando bajaba la curva. Las ventanas ya vienen en esta
         misma respuesta, así que no hay razón para esperar. */
      /* Los ejes del momento se guardan como RESPALDO, no se
         aplican a ciegas: si la ventana activa trae los suyos,
         mandan los suyos. */
      state.momentAxes = data.axes || null;
      applyWindow();

      /* Y se repinta la pastilla. `loadHistory` puede haber corrido
         ANTES que esta peticion, y entonces dibujo el delta con el
         respaldo —restando extremos de la serie— en vez de con el
         del servidor. Sin esta linea la pastilla se quedaba con esa
         cifra provisional y contradecia al subtitulo, que si usa la
         del servidor. Es la misma discrepancia de siempre, ahora
         por orden de llegada en vez de por columna. */
      updateRangeTag();

      /* Lo que se PUBLICA es lo que se ve: si la ventana manda,
         script.js tiene que repartir esa misma cifra. Publicar el
         indice del momento mientras el heroe muestra la media de
         30 dias reproduciria la contradiccion que esto viene a
         eliminar. */
      window.WM_CANONICAL_INDEX = state.windowScore ?? data.score;
      publishAndRefresh();

      /* El gráfico viejo de script.js se apaga en cuanto el índice
         nuevo está vivo: hasta ahora se dibujaban los dos, uno
         encima del otro, y en modo Hero seguía apareciendo el
         suyo porque mi CSS solo apagaba el mío. */
      $("heroTimelineBackdrop")?.classList.add("hidden");
      state.mood = data.mood;
      state.expressive = data.expressive;

      handleEvents(data);
    } catch {
      /* Sin conexion el personaje no se congela: se queda con los
         ultimos ejes y sigue respirando. */
    }
  }

  /* ---------------------------------------------------------
     UN SOLO NUMERO EN PANTALLA

     script.js reescribe titulo, subtitulo y score en cada una de
     sus actualizaciones con su formula vieja; el rig los impone en
     cada frame. La comprobacion es una lectura de textContent: si
     ya coinciden, no se toca el DOM.
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     EL BUCLE, CON RESPALDO A IMAGEN PLANA

     El sprite solo sustituye a la imagen fija cuando ha terminado
     de descargarse. Hasta entonces —y para siempre, si falla— se
     ve el render de siempre.

     Esto no es una cortesia: son 700-900 KB por emocion. En una
     conexion lenta, cambiar a la capa animada antes de tiempo
     dejaria un hueco justo donde esta lo mas visible de la
     pagina.
     --------------------------------------------------------- */

  /* ---------------------------------------------------------
     MARKET VITALS — EL RITMO SALE DEL MERCADO

     No es una animacion decorativa a velocidad fija: el monitor
     late a la frecuencia que marcan los ejes, igual que el
     personaje.

       activacion -> velocidad del desplazamiento
       tension    -> amplitud de la traza

     Un mercado dormido recorre la pantalla en 6s con la linea
     casi plana; uno en panico, en 1,2s y a plena amplitud. Es la
     diferencia entre un adorno y un instrumento.
     --------------------------------------------------------- */
  /* Se pide a script.js que reparta el numero nuevo. Sin esto,
     la pagina esperaria a su proximo ciclo —hasta un minuto— para
     enterarse de que el indice cambio. */
  function publishAndRefresh() {
    try {
      if (typeof window.recomputeHeroSystem === "function") {
        window.recomputeHeroSystem();
      }
      if (typeof window.updateHeaderMetrics === "function") {
        window.updateHeaderMetrics();
      }
    } catch {}
  }

  /* ---------------------------------------------------------
     AVANCE DE FOTOGRAMA — IDA Y VUELTA

     Va aqui y no en CSS porque la hoja es una REJILLA. Con dos
     animaciones, una por eje, `alternate` invertiria columnas y
     filas por separado y los fotogramas saldrian en desorden.

     Al llegar al ultimo, la secuencia vuelve sobre sus pasos hasta
     el primero. Con un bucle simple, el salto del fotograma 23 al
     0 es un corte; yendo y viniendo no hay corte que disimular,
     porque nunca se pasa de un extremo al otro.

     Solo se escribe en el DOM cuando el indice cambia de verdad:
     a 24 fotogramas por ciclo son unas decenas de escrituras por
     segundo, no una por frame.
     --------------------------------------------------------- */

  /* Traduce la subemocion a como se reproduce el bucle. */

  function enforceCanonical() {
    if (state.score === null || state.scrubbing) return;

    /* LA VENTANA MANDA — Y AHORA SÍ SE PUEDE.

       Este numero ha ido y vuelto dos veces, y merece la pena
       dejar escrito por que:

       1. Al principio era el indice del momento. Las pills movian
          el grafico pero no al personaje, y la seccion se partia
          en dos mitades que no se hablaban.

       2. Se cambio a la media de la ventana. Entonces el heroe
          decia "Neutral 56" mientras el gauge decia "80 Content"
          tres centimetros mas abajo: el resto de la pagina seguia
          con el indice del momento, calculado ademas con la
          formula vieja. Cuatro cifras distintas a la vez.

       3. Ahora el rig gobierna TAMBIEN el gauge y la barra
          superior. Al salir los tres de esta misma variable, la
          ventana puede mandar sin producir contradiccion: cambiar
          de pill mueve el personaje, el gauge y el indice a la
          vez, porque son el mismo numero.

       Lo que fallaba antes no era elegir la ventana: era que solo
       una parte de la pagina se enteraba. */
    const shown = Number.isFinite(state.windowScore)
      ? state.windowScore
      : state.score;
    const mood = moodFor(shown);
    const label = mood[0][0].toUpperCase() + mood[0].slice(1);

    const title = $("heroMood");
    if (title && title.textContent !== label) {
      title.textContent = label;
      title.className = `hero-mood mood-${mood[0]}`;
    }

    const sub = subemotionFor(mood[0], shown, state.axes, state.windowDelta);
    const subEl = $("heroSubtitle");
    const text = buildSubtitle(sub, mood[0]);
    if (subEl && text && subEl.textContent.trim() !== text) subEl.textContent = text;

    const num = $("heroScore");
    if (num && num.textContent !== String(shown)) {
      num.textContent = String(shown);
    }

    const face = $("heroFaceImg");
    if (face) {
      const src = HERO_IMG(mood[0]);
      if (!String(face.src).endsWith(src)) face.src = src;
    }

    /* ── YA NO SE INTERCEPTAN LA BARRA, EL GAUGE, EL PUNTERO NI
           BUBBLE MAPS ──

       Los pintaba script.js con su formula vieja y aqui se
       reescribian uno a uno: headerScore, headerMoodLabel,
       headerRegime, gaugeScore, bubbleGlobalScore, emotionPointer
       y emotionPointerImg. Siete elementos y una lista que habia
       que ampliar cada vez que aparecia una discrepancia nueva.

       Ahora el indice se publica en window.WM_CANONICAL_INDEX y
       script.js lo reparte desde el origen, asi que salen bien
       sin que nadie los corrija. Lo que queda aqui es solo lo que
       script.js NO sabe calcular: la subemocion, su narrativa y
       las capas del sprite.

       Si vuelve a aparecer una discrepancia, el sitio donde mirar
       es getEffectiveHeroScore(), no esta funcion. */

    /* El bucle animado y su modulacion. La imagen plana de arriba
       se sigue actualizando SIEMPRE, aunque haya sprite: es el
       respaldo, y tiene que estar en la emocion correcta el dia
       que el sprite falle. */



    /* ── EL GAUGE, TAMBIEN EL CANONICO ──

       BUG QUE ARREGLA: el heroe decia "Content 78" y el gauge, tres
       centimetros mas abajo, "60 Optimism". El gauge lo pinta
       script.js con su formula vieja, que no es el indice.

       En la revision anterior di por hecho que el gauge ya mostraba
       el canonico porque en aquella captura coincidian — coincidian
       POR CASUALIDAD. Comprobar dos numeros iguales no demuestra que
       vengan de la misma fuente, y eso fue un error de metodo por mi
       parte.

       Se llama a la MISMA funcion de script.js en vez de reescribir
       los textos: updateGauge pinta la aguja, el arco, el color y
       las dos cifras de una pasada. Tocar solo el texto dejaria la
       aguja apuntando a otro sitio, que es peor que la
       contradiccion original.

       Es una funcion de nivel superior de un script clasico, asi
       que vive en window. Si no estuviera, no se hace nada: el
       gauge se queda como estaba en lugar de romperse. */
    /* El overlay de subemocion, GOBERNADO en vez de apagado: el
       craneo-verde-con-cara-neutra venia de dos sistemas eligiendo
       cada uno por su lado. Aqui base y overlay salen del mismo
       mood en la misma pasada, asi que no pueden divergir. Solo
       hay overlay cuando la subemocion refina al mood base. */
  }

  /* ---------------------------------------------------------
     ARRANQUE
     --------------------------------------------------------- */
  function init() {
    if (!stage()) return;

    /* Sin selector de perfiles: la lectura es una (straight). El
       motor de lentes sigue en lib/hero-profiles.js por si vuelve
       como feature de compartir, separada de la lectura principal. */
    state.profile = "straight";

    document.addEventListener("click", (e) => {
      const view = e.target.closest?.("[data-view-mode]");
      if (view) { setView(view.dataset.viewMode); return; }

      /* SOLO las pills del hero (#heroTimeframes). La primera
         version escuchaba cualquier [data-timeframe] del documento,
         y el grafico de monedas usa el mismo atributo: cambiar BTC
         a 1H movia tambien la curva del heroe. Mismo click, dos
         modulos que no tienen nada que ver. */
      const tf = e.target.closest?.("#heroTimeframes [data-timeframe]");
      if (tf && TF[tf.dataset.timeframe]) setRange(tf.dataset.timeframe);
    });

    /* Recorrer los días. pointer* cubre ratón, dedo y lápiz con un
       solo juego de eventos. */
    const svg = $("heroHistorySvg");
    if (svg) {
      svg.addEventListener("pointerdown", (e) => {
        svg.setPointerCapture?.(e.pointerId);
        startScrub(e);
      });
      svg.addEventListener("pointermove", (e) => {
        if (state.scrubbing) scrubAt(e.clientX);
      });
      svg.addEventListener("pointerup", endScrub);
      svg.addEventListener("pointercancel", endScrub);
      svg.addEventListener("pointerleave", endScrub);
    }

    try {
      const savedView = localStorage.getItem(VIEW_KEY);
      if (savedView) state.view = savedView;
    } catch {}
    setView(state.view);

    /* Con la pestaña oculta no se pide nada ni se anima: el rig
       corre en cada frame y no tiene por que gastar bateria
       moviendo una cara que nadie mira. */
    /* Cambiar de estilo obliga a recargar el bucle: sin esto se
       quedaria el sprite del estilo anterior hasta que cambiara la
       emocion, que puede tardar horas. */


    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(state.timer);
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      } else {
        start();
      }
    });

    start();
  }

  function start() {
    clearInterval(state.timer);
    load();
    state.timer = setInterval(load, REFRESH_MS);
    if (!state.rafId) state.rafId = requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
