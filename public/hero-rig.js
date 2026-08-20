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
    return (v === "synth" || v === "classic") ? v : "classic";
  }

  const HERO_IMG = (mood) => `/assets/hero/${heroStyle()}/${mood}.png`;

  /* Bucle animado: 24 fotogramas de 640px en rejilla 6x4.
     Un archivo por estilo y emocion. */
  const IDLE_SPRITE = (mood) =>
    `/assets/hero/idle/${heroStyle()}/${mood}_idle.webp`;

  /* Rejilla de la hoja de reposo: 24 fotogramas en 6 columnas por
     4 filas. */
  const IDLE_COLS = 6;
  const IDLE_ROWS = 4;
  const IDLE_FRAMES = IDLE_COLS * IDLE_ROWS;

  /* Pasos de un ciclo de IDA Y VUELTA sin repetir los extremos:
     0,1,…,23,22,…,1 y otra vez 0. Son 46, no 48: contar 48
     mostraria el fotograma 23 y el 0 dos veces seguidas, y esa
     doble exposicion se ve como un tiron justo en el giro. */
  const IDLE_STEPS = IDLE_FRAMES * 2 - 2;

  /* ---------------------------------------------------------
     QUIEN SE REPRODUCE DE IDA Y VUELTA

     Ahora TODAS menos `concern`. Las hojas nuevas estan dibujadas
     como `content`: van de reposo a extremo, asi que el salto del
     ultimo fotograma al primero seria un brinco. Yendo y
     viniendo, el bucle cierra solo y no hay corte que disimular.

     `concern` es la excepcion y lo seguira siendo: su sudor
     RESBALA. Medido sobre la hoja, el centroide del cambio baja
     en 15 de los 24 pasos y sube en 7 — es la unica de las siete
     con una direccion clara. Del derecho el sudor cae; del reves
     subiria por la cara. En las demas el movimiento esta
     repartido casi mitad y mitad, que es la firma de un gesto sin
     direccion (respirar, parpadear), y por eso aguantan la vuelta
     sin que se note.

     La lista es de EXCEPCIONES, no de incluidos: si mañana llega
     otra hoja con algo que cae —lagrimas que corran, ceniza,
     humo— basta con añadirla aqui. Una emocion nueva entra por
     defecto en ida y vuelta, que es lo que quieren casi todas.
     --------------------------------------------------------- */
  const IDLE_NO_PINGPONG = new Set(["concern"]);

  const isPingPong = (mood) => !IDLE_NO_PINGPONG.has(String(mood || ""));

  /* ---------------------------------------------------------
     LAS 21 SUBEMOCIONES, SIN 21 ARCHIVOS

     Hay SIETE sprites. La subemocion no cambia el dibujo: cambia
     como se REPRODUCE. Cada entrada modula el mismo bucle.

       rate    multiplica la duracion del ciclo (mayor = mas lento)
       shake   temblor, 0 a 1
       tilt    ladeo en grados
       dim     desaturacion, 0 a 1

     Un `neutral_compression` es el bucle de neutral lento y
     apagado; un `neutral_pressure_building` es el mismo bucle
     acelerando con temblor. Misma imagen, dos estados que se leen
     distinto — y sumando los ejes en vivo, un continuo entre
     ellos, no tres casillas.
     --------------------------------------------------------- */
  const SUB_FX = {
    /* Frustration: todo rapido y sacudido. La capitulacion es la
       excepcion — es el agotamiento DESPUES del grito. */
    frustration:              { rate: 0.55, shake: 0.75, tilt: 0,    dim: 0 },
    frustration_panic:        { rate: 0.42, shake: 1.00, tilt: 0,    dim: 0 },
    frustration_capitulation: { rate: 1.30, shake: 0.20, tilt: 3.5,  dim: 0.35 },
    frustration_exhaustion:   { rate: 1.55, shake: 0.10, tilt: 4.5,  dim: 0.45 },

    concern:                  { rate: 0.85, shake: 0.35, tilt: 0,    dim: 0 },
    concern_pressure:         { rate: 1.00, shake: 0.25, tilt: 1.0,  dim: 0.05 },
    concern_fear_spike:       { rate: 0.55, shake: 0.85, tilt: 0,    dim: 0 },
    concern_breakdown:        { rate: 0.75, shake: 0.60, tilt: 3.0,  dim: 0.30 },

    /* Doubt: la duda es quietud con la mirada inquieta, asi que el
       cuerpo va lento aunque los ojos no. */
    doubt:                    { rate: 1.15, shake: 0.20, tilt: 1.5,  dim: 0.05 },
    doubt_confusion:          { rate: 1.00, shake: 0.45, tilt: 2.5,  dim: 0.10 },
    doubt_hesitation:         { rate: 1.35, shake: 0.12, tilt: 1.0,  dim: 0.12 },
    doubt_fake_recovery:      { rate: 0.90, shake: 0.40, tilt: 2.0,  dim: 0.08 },

    neutral:                  { rate: 1.20, shake: 0.08, tilt: 0,    dim: 0 },
    neutral_waiting:          { rate: 1.30, shake: 0.05, tilt: 0,    dim: 0.05 },
    neutral_compression:      { rate: 1.60, shake: 0.03, tilt: 2.0,  dim: 0.25 },
    neutral_pressure_building:{ rate: 0.80, shake: 0.45, tilt: 0,    dim: 0 },

    optimism:                 { rate: 0.95, shake: 0.05, tilt: 0,    dim: 0 },
    optimism_building:        { rate: 0.75, shake: 0.10, tilt: 0,    dim: 0 },
    optimism_confident:       { rate: 1.00, shake: 0.00, tilt: 0,    dim: 0 },
    optimism_pullback:        { rate: 1.25, shake: 0.15, tilt: 1.5,  dim: 0.15 },

    content:                  { rate: 1.15, shake: 0.00, tilt: 0,    dim: 0 },
    content_strength:         { rate: 1.00, shake: 0.00, tilt: 0,    dim: 0 },
    content_confidence:       { rate: 1.20, shake: 0.00, tilt: 0,    dim: 0 },
    content_overextended:     { rate: 0.70, shake: 0.25, tilt: 0,    dim: 0 },

    euphoria:                 { rate: 0.55, shake: 0.20, tilt: 0,    dim: 0 },
    euphoria_breakout:        { rate: 0.45, shake: 0.30, tilt: 0,    dim: 0 },
    euphoria_overheat:        { rate: 0.38, shake: 0.55, tilt: 0,    dim: 0 },
    euphoria_weakening:       { rate: 0.85, shake: 0.35, tilt: 2.0,  dim: 0.20 }
  };

  /* Sprites que ya se sabe que no existen o no cargan. Se
     comprueba UNA vez por emocion: sin esto, cada frame del rig
     dispararia otra peticion fallida. */
  /* Las claves llevan el estilo: el mismo mood en classic y en
     synth son dos archivos distintos, y sin el estilo en la clave
     el segundo heredaria el estado de carga del primero. */
  const idleReady = new Set();
  const idleFailed = new Set();
  let idleKey = null;

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
    /* Ciclo completo del sprite en ms (ida + vuelta). Declarado
       aqui con un valor sensato: si el avance de fotograma corre
       antes de la primera lectura del indice, sin esto dependeria
       de un respaldo implicito. */
    idleDur: 6000,
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
    advanceIdle(now);
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
      const w = state.windows?.[state.range];
      if (w) {
        state.windowScore = w.score;
        state.windowDelta = w.delta;
        target.arousal = Math.max(target.arousal,
          clamp(Math.abs(w.delta) / 20, 0, 1));
      } else {
        state.windowScore = null;
        state.windowDelta = 0;
      }

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

  function setRange(range) {
    if (!TF[range] || state.range === range) return;
    state.range = range;

    /* El score de la ventana ya está en memoria: se aplica EN EL
       ACTO, sin esperar a que baje el histórico. Antes el número
       no se movía hasta que respondía la red, y con la caché fría
       eso son cientos de milisegundos en los que la pill parecía
       no hacer nada. */
    const w = state.windows?.[range];
    state.windowScore = w ? w.score : null;
    state.windowDelta = w ? w.delta : 0;

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

      state.score = data.score;
      state.streakSeconds = Number(data.streakSeconds || 0);
      state.windows = data.windows || null;

      /* Se aplica AQUÍ, no solo al recargar el histórico.

         Antes dependía de loadHistory(), que puede no haber
         corrido todavía en la primera carga: el héroe arrancaba
         con el índice del momento y solo pasaba a la ventana
         cuando bajaba la curva. Las ventanas ya vienen en esta
         misma respuesta, así que no hay razón para esperar. */
      const w0 = state.windows?.[state.range];
      state.windowScore = w0 ? w0.score : null;
      state.windowDelta = w0 ? w0.delta : 0;

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
  function ensureIdle(mood) {
    const el = $("heroSprite");
    const st = stage();
    if (!el || !st) return;

    const key = `${heroStyle()}/${mood}`;

    if (idleFailed.has(key)) {
      st.classList.remove("wm-has-sprite");
      return;
    }

    if (idleKey === key) return;
    idleKey = key;
    state.idleKeyMood = mood;

    /* Se corta el bucle anterior en el acto. Sin esto, entre que
       cambia la emoción y termina de descargar la nueva, la capa
       animada sigue reproduciendo la ANTERIOR encima de la imagen
       plana ya actualizada: el título dice una emoción y el
       personaje enseña otra. */
    st.classList.remove("wm-has-sprite");

    const src = IDLE_SPRITE(mood);

    if (idleReady.has(key)) {
      el.style.backgroundImage = `url("${src}")`;
      st.classList.add("wm-has-sprite");
      return;
    }

    /* Mientras carga, la imagen plana sigue mandando. */
    st.classList.remove("wm-has-sprite");

    try {
      const probe = new Image();
      probe.onload = () => {
        idleReady.add(key);
        /* Puede haber cambiado de emocion O DE ESTILO mientras
           descargaba: si ya no es el actual, se guarda en cache y
           no se pinta. */
        if (idleKey !== key) return;
        el.style.backgroundImage = `url("${src}")`;
        st.classList.add("wm-has-sprite");
      };
      probe.onerror = () => {
        idleFailed.add(key);
        st.classList.remove("wm-has-sprite");
      };
      probe.src = src;
    } catch {
      idleFailed.add(key);
    }
  }

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
  function advanceIdle(now) {
    const el = $("heroSprite");
    if (!el || !stage()?.classList.contains("wm-has-sprite")) return;

    /* Se apagan las animaciones de rejilla del CSS, UNA sola vez.

       Una animación CSS gana siempre sobre un estilo inline
       mientras corre, así que si la hoja de estilos sigue
       animando background-position, todo lo que escriba este
       bucle se ignora. Sobrescribiendo la propiedad `animation`
       aquí, el avance de fotograma pasa a ser cosa del JS y el
       CSS conserva solo el temblor.

       Va inline y no en globals.css para que el cambio quepa en
       un único archivo. */
    if (!el.__animOff) {
      el.__animOff = true;
      el.style.animation =
        "hero-idle-shake calc(.10s + (1 - var(--idle-shake, 0)) * .26s) " +
        "linear infinite";
    }

    /* El mood actual sale de la clave de carga —"estilo/mood"—,
       que es la unica fuente que garantiza estar sincronizada con
       la hoja que se esta mostrando ahora mismo. */
    const moodKey = String(state.idleKeyMood || "");
    const pingpong = isPingPong(moodKey);

    const dur = state.idleDur || 3000;

    /* En ida y vuelta el ciclo dura el DOBLE, porque recorre la
       hoja dos veces. Sin esta correccion, una hoja de vaiven
       pasaria sus 24 fotogramas en la mitad de tiempo que
       `concern` y se veria acelerada frente a ella. */
    const cycle = pingpong ? dur : dur / 2;
    const steps = pingpong ? IDLE_STEPS : IDLE_FRAMES;

    const t = (now % cycle) / cycle;             // 0 … 1
    const step = Math.floor(t * steps);

    /* Ida y vuelta para casi todas; bucle simple para `concern`. */
    const frame = (!pingpong || step < IDLE_FRAMES)
      ? step
      : IDLE_STEPS - step;

    if (el.__frame === frame) return;
    el.__frame = frame;

    const col = frame % IDLE_COLS;
    const row = Math.floor(frame / IDLE_COLS);

    el.style.backgroundPosition =
      `${(col / (IDLE_COLS - 1)) * 100}% ${(row / (IDLE_ROWS - 1)) * 100}%`;
  }

  /* Traduce la subemocion a como se reproduce el bucle. */
  function applyIdleFx(sub, moodKey) {
    const el = stage();
    if (!el) return;

    const fx = SUB_FX[sub] || SUB_FX[moodKey] ||
               { rate: 1, shake: 0, tilt: 0, dim: 0 };

    /* Duracion base 3,0s modulada por la subemocion Y por los ejes
       en vivo, asi que dos mercados en la misma subemocion no se
       mueven exactamente igual.

       Suelo de 0,9s y techo de 4,2s: por debajo el bucle parpadea
       y por encima baja de 6 fps y se ve a saltos — con 24
       fotogramas, 4,2s son 5,7 fps, que es el limite. */
    const base = 3.0 * fx.rate * (1.35 - state.axes.arousal * 0.7);
    const dur = clamp(base, 0.9, 4.2);

    el.style.setProperty("--idle-dur", dur.toFixed(2) + "s");

    /* En ms para el avance de fotograma, que no lee CSS. El ciclo
       completo es la ida MAS la vuelta, asi que se duplica: la
       duracion configurada sigue significando "lo que tarda en
       llegar al extremo". */
    state.idleDur = dur * 2000;
    el.style.setProperty("--idle-shake",
      clamp(fx.shake + state.axes.tension * 0.35, 0, 1).toFixed(2));
    el.style.setProperty("--idle-tilt",
      (fx.tilt + state.axes.fatigue * 3.5).toFixed(2) + "deg");
    el.style.setProperty("--idle-dim",
      clamp(fx.dim + state.axes.fatigue * 0.35, 0, 0.6).toFixed(2));
  }

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

    /* El bucle animado y su modulacion. La imagen plana de arriba
       se sigue actualizando SIEMPRE, aunque haya sprite: es el
       respaldo, y tiene que estar en la emocion correcta el dia
       que el sprite falle. */
    ensureIdle(mood[0]);
    applyIdleFx(sub, mood[0]);

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
    ensureIdle(mood[0]);
    applyIdleFx(sub, mood[0]);

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
    /* Cambiar de estilo obliga a recargar el bucle: sin esto se
       quedaria el sprite del estilo anterior hasta que cambiara la
       emocion, que puede tardar horas. */
    document.getElementById("styleSelector")
      ?.addEventListener("change", () => { idleKey = null; });

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
