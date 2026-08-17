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

  const state = {
    axes: { valence: 0, arousal: 0, tension: 0, fatigue: 0 },
    score: null,
    mood: null,
    expressive: null,
    profile: "straight",
    lastMood: null,
    timer: null,
    rafId: null,
    shockUntil: 0
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
    state.rafId = requestAnimationFrame(tick);
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
      state.mood = data.mood;
      state.expressive = data.expressive;

      Object.assign(target, data.axes || {});
      handleEvents(data);
      renderProfiles(data);
      renderReadout(data);
    } catch {
      /* Sin conexion el personaje no se congela: se queda con los
         ultimos ejes y sigue respirando. */
    }
  }

  /* ---------------------------------------------------------
     SELECTOR DE PERFIL

     Se pinta con el score que cada perfil daria AHORA MISMO. Se
     elige viendo que cara pone cada uno con el mercado de este
     momento, no leyendo una descripcion.
     --------------------------------------------------------- */
  function renderProfiles(data) {
    const host = $("heroProfiles");
    if (!host || !Array.isArray(data.profiles)) return;

    host.innerHTML = data.profiles.map((p) => `
      <button type="button" class="hero-profile${p.id === state.profile ? " active" : ""}"
              data-profile="${p.id}" title="${escapeHtml(p.tagline || "")}">
        <span class="hero-profile-name">${escapeHtml(p.name)}</span>
        <span class="hero-profile-score" data-mood="${p.mood}">${p.score}</span>
      </button>`).join("");
  }

  /* El numero canonico SIEMPRE visible junto a la lente. En cuanto
     se pueda confundir cual es el dato real, el indice deja de ser
     una medicion. */
  function renderReadout(data) {
    const el = $("heroIndexReadout");
    if (!el) return;

    const conf = Number(data.confidence || 0);
    el.innerHTML = `
      <span class="hero-index-label">Index</span>
      <strong class="hero-index-value">${data.score}</strong>
      <span class="hero-index-sep">·</span>
      <span class="hero-index-lens">seen by ${escapeHtml(data.profile?.name || "")}</span>
      ${conf < 0.8 ? `<span class="hero-index-conf"
        title="Señales medidas: ${Math.round(conf * 100)}% del peso total"
        >${Math.round(conf * 100)}%</span>` : ""}`;
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function setProfile(id) {
    state.profile = id;
    try { localStorage.setItem(PROFILE_KEY, id); } catch {}
    const el = stage();
    if (el) el.dataset.profile = id;
    load();
  }

  /* ---------------------------------------------------------
     ARRANQUE
     --------------------------------------------------------- */
  function init() {
    if (!stage()) return;

    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) state.profile = saved;
    } catch {}

    stage().dataset.profile = state.profile;

    document.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-profile]");
      if (btn) setProfile(btn.dataset.profile);
    });

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
