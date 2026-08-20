/* ===========================================================
   BAG MOOD RIG — el personaje de la cartera, animado

   Pone la misma capa de bucle que ya tiene el heroe sobre el
   personaje de Bag Mood, que hasta ahora era una imagen plana.

   POR QUE ES UN ARCHIVO APARTE:
   Misma razon que hero-rig.js y wojak-game.js. script.js pasa de
   8.000 lineas y ya perdio funciones al reescribir bloques. Este
   modulo no toca ni una variable suya: observa el <img> que
   script.js ya pinta y añade una capa encima. Si se borra el
   archivo, Bag Mood vuelve exactamente a como estaba.

   COMO SABE QUE EMOCION MOSTRAR — Y POR QUE NO PREGUNTA:
   La lee de la RUTA de la imagen plana, que es
   /assets/hero/<estilo>/<emocion>.png. De ahi salen las dos
   cosas que necesita, emocion y estilo, y salen de lo que
   script.js acaba de decidir, no de un calculo paralelo.

   Esto ultimo importa mas de lo que parece: el score de la
   cartera NO es el indice global. Mide otro sujeto —lo que tiene
   el usuario, no el mercado— y ya se acordo que no se unifican.
   Si este modulo calculara su propia emocion, volveriamos a
   tener dos cifras hablando del mismo personaje, que es el bug
   que llevamos toda la semana cerrando. Aqui solo se OBEDECE.
   =========================================================== */

(function () {
  "use strict";

  /* --- rejilla y vaiven: espejo de hero-rig.js ---------------
     DUPLICACION CONSCIENTE. Si cambian alli, cambian aqui:
     la rejilla, la lista de excepciones y la formula de
     duracion. smoke-bag.mjs compara los tres pares. */
  const COLS = 6, ROWS = 4;
  const FRAMES = COLS * ROWS;
  const STEPS = FRAMES * 2 - 2;              // 46: sin repetir extremos

  /* Lista de EXCEPCIONES al vaiven, no de incluidos.
     concern: su sudor resbala y del reves subiria por la cara.
     frustration: el grito se abre y se descarga; del reves la
     boca se cerraria sola y se lo tragaria. */
  const NO_PINGPONG = new Set(["concern", "frustration"]);
  const isPingPong = (mood) => !NO_PINGPONG.has(mood);

  /* Solo las siete base. Bag Mood no tiene subemociones y no debe
     tenerlas: los cuatro ejes del rig describen el MERCADO, y
     aplicarlos a una cartera seria inventar una lectura que nadie
     ha calculado. */
  const RATE = {
    frustration: 0.55,
    concern:     0.85,
    doubt:       1.15,
    neutral:     1.20,
    optimism:    0.95,
    content:     1.15,
    euphoria:    0.55
  };

  const MOODS = Object.keys(RATE);

  const SHEET = (style, mood) =>
    `/assets/hero/idle/${style}/${mood}_idle.webp`;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (id) => document.getElementById(id);

  /* Hojas que ya se sabe si cargan o no. Se comprueba UNA vez por
     estilo y emocion: sin esto, cada repintado de Bag Mood —uno
     cada diez segundos con el refresco de precios— dispararia otra
     peticion de 700 KB o, peor, otro 404. */
  const ready = new Set();
  const failed = new Set();

  const state = {
    img: null,
    sprite: null,
    key: null,        // "estilo/emocion" de la hoja montada
    mood: null,
    durMs: 6000,
    frame: -1,
    visible: true,
    raf: 0
  };

  /* ---------------------------------------------------------
     ESTILOS

     Se inyectan desde aqui y con nombres propios en vez de
     tocar globals.css, para que todo el cambio quepa en un
     archivo nuevo y no haya que editar una hoja de 3.000 lineas
     por cinco reglas.
     --------------------------------------------------------- */
  function injectStyles() {
    if ($("wmBagRigStyles")) return;
    const css = document.createElement("style");
    css.id = "wmBagRigStyles";
    css.textContent = `
      .wm-bag-sprite{
        position:absolute;
        pointer-events:none;
        background-repeat:no-repeat;
        background-size:${COLS * 100}% ${ROWS * 100}%;
        opacity:0;
        transition:opacity .25s ease;
      }
      .wm-bag-sprite.is-on{opacity:1}
      @media (prefers-reduced-motion:reduce){
        .wm-bag-sprite{display:none}
      }`;
    document.head.appendChild(css);
  }

  /* ---------------------------------------------------------
     LA CAPA

     Va como hermana del <img>, no envolviendolo. Envolver
     cambiaria la estructura que espera el CSS existente
     (selectores de hijo directo, rejillas) y romperia cosas que
     ni se ven desde aqui.

     Su caja se copia de la del <img> en pixeles, medida sobre el
     padre. Asi la capa cae exactamente donde esta la cara, sea
     cual sea el tamaño que le de la maquetacion.
     --------------------------------------------------------- */
  function ensureLayer() {
    const img = $("bagMoodHeroImg");
    if (!img || !img.parentElement) return false;

    if (state.img !== img) {
      state.img = img;
      state.sprite = null;
    }
    if (state.sprite && state.sprite.isConnected) return true;

    const parent = img.parentElement;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    const sprite = document.createElement("div");
    sprite.id = "wmBagSprite";
    sprite.className = "wm-bag-sprite";
    sprite.setAttribute("aria-hidden", "true");
    img.insertAdjacentElement("afterend", sprite);

    state.sprite = sprite;
    syncBox();
    return true;
  }

  function syncBox() {
    const { img, sprite } = state;
    if (!img || !sprite) return;
    sprite.style.left   = img.offsetLeft + "px";
    sprite.style.top    = img.offsetTop + "px";
    sprite.style.width  = img.offsetWidth + "px";
    sprite.style.height = img.offsetHeight + "px";
  }

  /* Emocion y estilo salen de /assets/hero/<estilo>/<emocion>.png */
  function readFromImage() {
    const src = state.img?.getAttribute("src") || "";
    const m = src.match(/\/assets\/hero\/([^/]+)\/([^/]+)\.png/);
    if (!m) return null;
    const style = m[1], mood = m[2];
    return MOODS.includes(mood) ? { style, mood } : null;
  }

  /* El ritmo sale del score de la CARTERA, no del indice global.
     Cuanto mas lejos de 50 esta la cartera, mas se mueve: una
     bolsa muy en verde o muy en rojo no respira igual que una
     plana. El texto es "NN/100". */
  function bagArousal() {
    const raw = $("bagMoodScore")?.textContent || "";
    const n = Number(raw.split("/")[0]);
    if (!Number.isFinite(n)) return 0.5;
    return clamp(Math.abs(n - 50) / 50, 0, 1);
  }

  /* Misma formula y mismos topes que applyIdleFx en hero-rig.js.
     Por debajo de 0,9 s el bucle parpadea; por encima de 4,2 s
     son 5,7 fps con 24 fotogramas y se ve a saltos. */
  function durationFor(mood) {
    const rate = RATE[mood] ?? 1;
    return clamp(3.0 * rate * (1.35 - bagArousal() * 0.7), 0.9, 4.2);
  }

  /* La capa animada solo se enciende cuando la hoja HA CARGADO.
     Mientras tanto manda la imagen plana, que es la que ya se ve
     hoy. Son 400-900 KB por emocion: encender antes de tiempo
     dejaria un hueco donde deberia estar la cara. */
  function mount() {
    if (!ensureLayer()) return;

    const read = readFromImage();
    if (!read) return;

    const { style, mood } = read;
    const key = `${style}/${mood}`;

    state.durMs = durationFor(mood) * 2000;   // ida + vuelta

    if (key === state.key) return;

    /* Se corta el bucle anterior en el acto: entre que cambia la
       emocion y termina de descargar la nueva, la capa seguiria
       reproduciendo la ANTERIOR sobre una imagen plana ya
       actualizada, y el titulo diria una cosa y la cara otra. */
    show(false);
    state.key = key;
    state.mood = mood;
    state.frame = -1;

    if (failed.has(key)) return;

    if (ready.has(key)) {
      state.sprite.style.backgroundImage = `url("${SHEET(style, mood)}")`;
      show(true);
      return;
    }

    const probe = new Image();
    probe.onload = () => {
      ready.add(key);
      if (state.key !== key) return;        // cambio mientras bajaba
      state.sprite.style.backgroundImage = `url("${SHEET(style, mood)}")`;
      show(true);
    };
    probe.onerror = () => {
      failed.add(key);
      if (state.key === key) show(false);
    };
    probe.src = SHEET(style, mood);
  }

  /* Al encender la capa se apaga la plana. Va en estilo inline y
     no en una clase porque script.js reescribe el className del
     <img> en cada repintado y se la llevaria por delante; el
     estilo inline sobrevive. Sin apagarla se verian las dos a la
     vez, y como el personaje tiene fondo transparente eso es un
     fantasma alrededor de la cara, no una imagen tapada. */
  function show(on) {
    if (!state.sprite) return;
    state.sprite.classList.toggle("is-on", !!on);
    if (state.img) state.img.style.opacity = on ? "0" : "";
  }

  const isOn = () => !!state.sprite?.classList.contains("is-on");

  /* Avance de fotograma: copia del de hero-rig.js, incluida la
     correccion de duracion del vaiven. Solo escribe en el DOM
     cuando el fotograma cambia de verdad. */
  function tick(now) {
    state.raf = requestAnimationFrame(tick);
    if (!state.visible || !isOn()) return;

    const pingpong = isPingPong(state.mood);
    const cycle = pingpong ? state.durMs : state.durMs / 2;
    const steps = pingpong ? STEPS : FRAMES;

    const step  = Math.floor(((now % cycle) / cycle) * steps);
    const frame = (!pingpong || step < FRAMES) ? step : STEPS - step;

    if (state.frame === frame) return;
    state.frame = frame;

    const col = frame % COLS;
    const row = Math.floor(frame / COLS);
    state.sprite.style.backgroundPosition =
      `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`;
  }

  /* ---------------------------------------------------------
     ARRANQUE

     Bag Mood se pinta desde JS, asi que el <img> puede no existir
     todavia cuando este archivo se ejecuta. En vez de adivinar un
     retardo, se espera a que aparezca.
     --------------------------------------------------------- */
  function start() {
    if (!$("bagMoodSection")) return;
    injectStyles();

    /* script.js reescribe src y className del <img> en cada
       repintado. Observarlo es lo que mantiene la capa sincronizada
       sin tocar una sola linea suya. */
    const watch = new MutationObserver(mount);
    const attach = () => {
      const img = $("bagMoodHeroImg");
      if (!img) return false;
      watch.observe(img, { attributes: true, attributeFilter: ["src", "class"] });
      mount();
      return true;
    };

    if (!attach()) {
      const wait = new MutationObserver(() => { if (attach()) wait.disconnect(); });
      wait.observe(document.body, { childList: true, subtree: true });
    }

    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(syncBox);
      const target = $("bagMoodSection");
      if (target) ro.observe(target);
    }
    window.addEventListener("resize", syncBox, { passive: true });

    /* Con la pestaña oculta o la seccion fuera de pantalla no se
       avanza ni un fotograma. Es un segundo bucle de animacion en
       una pagina que ya tiene el del heroe: no vale con que sea
       barato, tiene que apagarse cuando no se ve. */
    document.addEventListener("visibilitychange", () => {
      state.visible = !document.hidden && state.onScreen !== false;
    });

    if (typeof IntersectionObserver === "function") {
      const io = new IntersectionObserver((entries) => {
        state.onScreen = entries.some((e) => e.isIntersecting);
        state.visible = state.onScreen && !document.hidden;
      }, { rootMargin: "120px" });
      const target = $("bagMoodSection");
      if (target) io.observe(target);
    }

    state.raf = requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
