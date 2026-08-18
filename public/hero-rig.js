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

  const HERO_IMG = (mood) => `/assets/hero/classic/${mood}.png`;

  /* ---------------------------------------------------------
     LAS 21 SUBEMOCIONES

     El catalogo de siempre (script.js las elegia con su formula
     vieja). Ahora las elige el rig con los CUATRO EJES, que es lo
     que garantiza que base, overlay y texto salgan siempre del
     mismo estado — la mezcla de craneo verde con cara neutra venia
     de dos sistemas eligiendo cada uno por su lado.

     tension alta -> la variante de presion o miedo
     fatiga alta  -> la de agotamiento o compresion
     arousal alta -> la intensa
     --------------------------------------------------------- */
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
    windowScore: null,
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

  function tick() {
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
      const pts = visibleSeries();
      const scores = pts.map((p) => Number(p.score)).filter(Number.isFinite);
      if (scores.length >= 2) {
        state.windowScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        state.windowDelta = Math.round(scores[scores.length - 1] - scores[0]);
        /* El movimiento de la ventana alimenta la reaccion: una
           semana que subio 20 puntos se ve mas encendida que una
           plana, aunque la media sea parecida. */
        target.arousal = Math.max(target.arousal,
          clamp(Math.abs(state.windowDelta) / 20, 0, 1));
      }

      /* La etiqueta lleva tambien CUANTO se movio el indice en la
         ventana elegida. Es lo que reconecta las pills con el
         personaje sin volver al comportamiento viejo: la cara
         sigue siendo el AHORA (cambiarla por ventana era lo que
         producia dos emociones contradiciendose en pantalla), pero
         la ventana si te dice que camino trajo hasta aqui. */
      const tag = $("heroRangeTag");
      if (tag) {
        const pts = visibleSeries();
        const first = Number(pts[0]?.score);
        const last = Number(pts[pts.length - 1]?.score);
        const d = Number.isFinite(first) && Number.isFinite(last)
          ? Math.round(last - first) : null;
        const arrow = d > 0 ? `▲${d}` : d < 0 ? `▼${Math.abs(d)}` : "—";
        tag.textContent = d === null
          ? `EMOTION · ${tf.label}`
          : `EMOTION · ${tf.label} · ${arrow}`;
        tag.dataset.dir = d > 0 ? "up" : d < 0 ? "down" : "flat";
      }
    } catch {}
  }

  /* La MISMA serie recortada para dibujar y para recorrer: si el
     dibujo y el scrub recortaran cada uno por su lado, el dedo
     apuntaria a un dia y la pastilla mostraria otro. */
  function visibleSeries() {
    return state.history.slice(-400);
  }

  function setRange(range) {
    if (!TF[range] || state.range === range) return;
    state.range = range;
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
      PAD + (1 - clamp(Number(p.score) || 50, 0, 100) / 100) * (H - PAD * 2)
    ]);

    const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    path.setAttribute("d", d);
    area.setAttribute("d", `${d} L${W} ${H} L0 ${H} Z`);

    const mid = $("heroHistoryMid");
    if (mid) {
      const y = PAD + 0.5 * (H - PAD * 2);
      mid.setAttribute("d", `M0 ${y} L${W} ${y}`);
    }

    state.drawn = xy;
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

    const score = Math.round(Number(p.score) || 50);
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

      state.score = data.score;
      state.streakSeconds = Number(data.streakSeconds || 0);

      /* El gráfico viejo de script.js se apaga en cuanto el índice
         nuevo está vivo: hasta ahora se dibujaban los dos, uno
         encima del otro, y en modo Hero seguía apareciendo el
         suyo porque mi CSS solo apagaba el mío. */
      $("heroTimelineBackdrop")?.classList.add("hidden");
      state.mood = data.mood;
      state.expressive = data.expressive;

      Object.assign(target, data.axes || {});
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
  function enforceCanonical() {
    if (state.score === null || state.scrubbing) return;

    /* Un solo numero por vista: la media de la ventana elegida (o
       el indice actual mientras el historico no ha cargado).
       Titulo, score, cara, overlay y subtitulo salen TODOS de el. */
    const shown = Number.isFinite(state.windowScore) ? state.windowScore : state.score;
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

    /* El overlay de subemocion, GOBERNADO en vez de apagado: el
       craneo-verde-con-cara-neutra venia de dos sistemas eligiendo
       cada uno por su lado. Aqui base y overlay salen del mismo
       mood en la misma pasada, asi que no pueden divergir. Solo
       hay overlay cuando la subemocion refina al mood base. */
    const overlay = $("heroFaceOverlayImg");
    if (overlay) {
      if (sub !== mood[0]) {
        const osrc = `/assets/overlays/classic/${sub}.png`;
        if (!String(overlay.src).endsWith(osrc)) overlay.src = osrc;
        if (overlay.style.display !== "") overlay.style.display = "";
        overlay.classList.remove("hidden");
      } else if (overlay.style.display !== "none") {
        overlay.style.display = "none";
        overlay.classList.add("hidden");
      }
    }
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
