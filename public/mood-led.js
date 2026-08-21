/* ===========================================================
   MOOD LED — el escenario como pantalla viva

   Llena el fondo de la seccion Crypto Market Mood con una rejilla
   de celdas tipo panel LED que se encienden y apagan siguiendo el
   estado real del mercado.

   NADA DE ESTO ES DECORACION ALEATORIA. Los cuatro ejes que
   hero-rig.js ya publica sobre el escenario salen de
   /api/index-score, es decir del motor del indice, y aqui se leen
   tal cual:

     --wm-arousal   cuantas celdas se encienden y a que velocidad
                    se mueve el campo. Mercado activo = pantalla
                    poblada; mercado muerto = cuatro luces.
     --wm-tension   inestabilidad. Sube el centelleo y aparecen
                    chispas sueltas.
     --wm-fatigue   apagado general y deriva mas lenta. Un mercado
                    cansado tiene la pantalla mortecina.
     --wm-valence   empuja el brillo hacia arriba o hacia abajo
                    dentro del color de la emocion.

   El color sale de la clase `mood-<emocion>` que ya usa la
   pagina, leida del CSS de verdad, no de una tabla copiada aqui:
   si mañana cambias el verde de `content` en globals.css, la
   pantalla cambia con el.

   POR QUE ES UN ARCHIVO APARTE:
   Misma razon que hero-rig.js, wojak-game.js y bag-mood-rig.js.
   No toca script.js ni globals.css. Si se borra el archivo, la
   seccion vuelve exactamente a como estaba.

   EL CAMPO NO ES RUIDO BLANCO. Un parpadeo aleatorio por celda es
   nieve de televisor y se ve barato a los tres segundos. Aqui las
   celdas se encienden segun un campo de ruido de valor de dos
   octavas que deriva despacio: eso produce NUBES, manchas que se
   forman, cruzan y se deshacen. Es lo que hace que parezca
   atmosfera y no un salvapantallas.
   =========================================================== */

(function () {
  "use strict";

  const CFG = {
    pitch:       13,     // separacion de celdas en px CSS
    gap:         3,      // hueco entre celdas: hace visible la rejilla
    levels:      4,      // escalones de brillo, como un panel real
    maxAlpha:    0.60,   // brillo del borde; el centro va enmascarado
    holeRadius:  0.42,   // radio del hueco central, en fraccion del alto
    fps:         30,     // el ojo no pide mas para esto y ahorra bateria
    driftX:      0.012,  // deriva horizontal del campo por segundo
    sweepEvery:  9,      // segundos entre barridos de refresco
    sparkChance: 0.0016  // probabilidad por celda y frame con tension 1
  };

  const MOOD_FALLBACK = {
    frustration:"#e5484d", concern:"#e8833a", doubt:"#d4b23f",
    neutral:"#7c8698", optimism:"#5fb865", content:"#3fa96b",
    euphoria:"#26d07c"
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (id) => document.getElementById(id);

  function stage() {
    const el = document.querySelector("[data-mood-led]")
      || $("heroStage")
      || document.querySelector(".dashboard")
      || null;
    return el?.dataset?.moodLed === "off" ? null : el;
  }

  /* ---------------------------------------------------------
     INTERRUPTOR

     Esto cambia el aspecto de lo mas visible de la pagina. Si
     sobre el personaje de verdad no funciona —brilla de mas,
     tapa el grafico, lo que sea— hay que poder apagarlo en el
     acto y sin desplegar: basta con abrir
     wojakmeter.com/?led=off. Tambien vale
     `data-mood-led="off"` en el escenario para dejarlo apagado
     hasta el siguiente cambio.
     --------------------------------------------------------- */
  function disabled() {
    try {
      return new URLSearchParams(location.search).get("led") === "off";
    } catch { return false; }
  }

  /* ---------------------------------------------------------
     RUIDO DE VALOR

     Hash entero sin tablas ni asignaciones: se llama unas 60.000
     veces por fotograma y cualquier objeto intermedio acabaria
     en el recolector de basura cada pocos segundos, que es como
     se cuelan los tirones en una animacion que "no gasta nada".
     --------------------------------------------------------- */
  function hash3(x, y, z) {
    let h = x * 374761393 + y * 668265263 + z * 2147483647;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  const fade = (t) => t * t * (3 - 2 * t);

  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);

    const c000 = hash3(xi, yi, zi),     c100 = hash3(xi + 1, yi, zi);
    const c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
    const c001 = hash3(xi, yi, zi + 1),     c101 = hash3(xi + 1, yi, zi + 1);
    const c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);

    const x00 = c000 + (c100 - c000) * xf, x10 = c010 + (c110 - c010) * xf;
    const x01 = c001 + (c101 - c001) * xf, x11 = c011 + (c111 - c011) * xf;
    const y0 = x00 + (x10 - x00) * yf, y1 = x01 + (x11 - x01) * yf;
    return y0 + (y1 - y0) * zf;
  }

  /* Dos octavas: la primera pone las nubes grandes, la segunda las
     rompe por dentro. Con una sola el campo parece una mancha de
     lava; con tres ya no se distingue de ruido. */
  function field(x, y, t) {
    return noise3(x * 0.16, y * 0.22, t) * 0.68
         + noise3(x * 0.44, y * 0.58, t * 1.7) * 0.32;
  }

  /* ---------------------------------------------------------
     COLOR

     Se pregunta al CSS en vez de guardar una tabla: la pagina ya
     tiene `mood-<emocion>` y esa es la fuente. Una tabla aqui
     seria un cuarto sitio donde mantener los mismos siete colores
     sincronizados a mano.
     --------------------------------------------------------- */
  const colorCache = new Map();

  function moodRGB(mood) {
    if (colorCache.has(mood)) return colorCache.get(mood);

    let rgb = null;
    try {
      const probe = document.createElement("span");
      probe.className = `mood-${mood}`;
      probe.style.cssText = "position:absolute;left:-9999px;top:0";
      document.body.appendChild(probe);
      const parsed = getComputedStyle(probe).color.match(/(\d+),\s*(\d+),\s*(\d+)/);
      probe.remove();
      /* Un gris de texto por defecto significa que la clase no
         pinto nada: mejor el respaldo que teñirlo todo de gris. */
      if (parsed) {
        const c = [ +parsed[1], +parsed[2], +parsed[3] ];
        const plano = Math.abs(c[0] - c[1]) < 6 && Math.abs(c[1] - c[2]) < 6;
        if (!plano || mood === "neutral") rgb = c;
      }
    } catch {}

    if (!rgb) {
      const hex = MOOD_FALLBACK[mood] || MOOD_FALLBACK.neutral;
      rgb = [ parseInt(hex.slice(1, 3), 16),
              parseInt(hex.slice(3, 5), 16),
              parseInt(hex.slice(5, 7), 16) ];
    }

    colorCache.set(mood, rgb);
    return rgb;
  }

  /* ---------------------------------------------------------
     ESTADO

     Los ejes se leen del escenario, donde hero-rig.js los deja.
     Si el rig no ha llegado a escribirlos todavia, los valores por
     defecto dejan una pantalla tranquila en vez de una apagada:
     un fondo negro mientras carga se ve como un fallo.
     --------------------------------------------------------- */
  const S = {
    el: null, canvas: null, ctx: null,
    w: 0, h: 0, cols: 0, rows: 0, dpr: 1,
    mood: "neutral", rgb: [124, 134, 152],
    arousal: 0.45, tension: 0.2, fatigue: 0.2, valence: 0.5,
    // valores mostrados, que persiguen a los reales sin saltos
    aShown: 0.45, tShown: 0.2, fShown: 0.2, vShown: 0.5,
    sweepAt: -999, shockAt: -999,
    visible: true, onScreen: true, reduced: false,
    last: 0, raf: 0
  };

  function readAxes() {
    const el = S.el;
    if (!el) return;

    const cs = getComputedStyle(el);
    const num = (name, def) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? clamp(v, 0, 1) : def;
    };

    S.arousal = num("--wm-arousal", S.arousal);
    S.tension = num("--wm-tension", S.tension);
    S.fatigue = num("--wm-fatigue", S.fatigue);
    S.valence = num("--wm-valence", S.valence);

    /* `data-mood` lo escribe script.js sobre el escenario, no
       hero-rig.js. Si todavia no esta, se mantiene el ultimo
       conocido en vez de caer a neutral: un parpadeo a gris cada
       vez que el DOM se adelanta se ve peor que un color viejo
       durante medio segundo. */
    const mood = el.dataset.mood || S.mood;
    if (mood !== S.mood) {
      S.mood = mood;
      S.rgb = moodRGB(mood);
    }
  }

  /* ---------------------------------------------------------
     MONTAJE

     El lienzo va como PRIMER hijo del escenario y en posicion
     absoluta. Un elemento posicionado se pinta por encima del
     fondo de sus hermanos estaticos, asi que sin hacer nada mas
     la pantalla taparia al personaje. Por eso a los hermanos que
     estan en `static` se les pone `position:relative`: no cambia
     el flujo ni un pixel y los devuelve por encima del lienzo.
     --------------------------------------------------------- */
  function mount() {
    const el = stage();
    if (!el || S.canvas) return !!S.canvas;

    S.el = el;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";

    const canvas = document.createElement("canvas");
    canvas.id = "wmMoodLed";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;" +
      "pointer-events:none;z-index:0;border-radius:inherit;" +
      "opacity:0;transition:opacity .8s ease";

    el.insertBefore(canvas, el.firstChild);

    Array.from(el.children).forEach((child) => {
      if (child === canvas) return;
      if (getComputedStyle(child).position === "static") child.style.position = "relative";
    });

    S.canvas = canvas;
    S.ctx = canvas.getContext("2d", { alpha: true });

    resize();
    readAxes();
    S.rgb = moodRGB(S.mood);
    requestAnimationFrame(() => { canvas.style.opacity = "1"; });
    return true;
  }

  function resize() {
    const el = S.el, canvas = S.canvas;
    if (!el || !canvas) return;

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    /* Se limita a 2 la densidad de pixeles: en una pantalla 3x
       esto serian nueve veces mas pixeles que rellenar para una
       rejilla que ya es visiblemente cuadriculada a proposito. */
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.w = rect.width;
    S.h = rect.height;
    canvas.width  = Math.round(S.w * S.dpr);
    canvas.height = Math.round(S.h * S.dpr);
    S.ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);

    S.cols = Math.ceil(S.w / CFG.pitch);
    S.rows = Math.ceil(S.h / CFG.pitch);
  }

  /* La mascara: oscuro en el centro, donde esta el personaje, y
     encendido hacia los bordes. Sin esto la pantalla compite con
     la cara en vez de acompañarla, y la cara siempre gana o
     siempre pierde: las dos cosas son malas. */
  function maskAt(cx, cy) {
    const nx = (cx - S.w / 2) / (S.w / 2);
    const ny = (cy - S.h / 2) / (S.h / 2);
    const d = Math.sqrt(nx * nx * 0.72 + ny * ny);
    return clamp((d - CFG.holeRadius) / (1 - CFG.holeRadius), 0, 1);
  }

  function draw(now) {
    const ctx = S.ctx;
    if (!ctx || !S.cols) return;

    const t = now / 1000;

    /* Los ejes se persiguen en vez de saltar. Cuando el indice se
       mueve de golpe, un cambio instantaneo se ve como un fallo de
       render; asi la pantalla "responde" durante un segundo. */
    const k = 0.045;
    S.aShown += (S.arousal - S.aShown) * k;
    S.tShown += (S.tension - S.tShown) * k;
    S.fShown += (S.fatigue - S.fShown) * k;
    S.vShown += (S.valence - S.vShown) * k;

    const arousal = S.aShown, tension = S.tShown;
    const fatigue = S.fShown, valence = S.vShown;

    /* Umbral: cuantas celdas superan el corte. Con arousal alto
       baja el umbral y se enciende media pantalla; con fatiga alta
       sube y se apagan.

       El techo es 0.80 y no 0.95 a proposito. Con el corte casi al
       maximo la pantalla se quedaba NEGRA, y un mercado parado no
       se lee como calma: se lee como que el componente esta roto.
       Un panel en reposo sigue teniendo luces, pocas y lentas. */
    const cut = clamp(0.80 - arousal * 0.40 + fatigue * 0.10, 0.16, 0.80);
    const speed = (0.05 + arousal * 0.20) * (1 - fatigue * 0.45);
    const drift = t * CFG.driftX * (1 + arousal * 2.2) * 60;
    const z = t * speed;

    /* Barrido de refresco: una banda que cruza de arriba abajo
       cada pocos segundos, como el repintado de un panel de
       verdad. Es lo que convence al ojo de que es una PANTALLA. */
    if (t - S.sweepAt > CFG.sweepEvery) S.sweepAt = t;
    const sweepY = ((t - S.sweepAt) / 1.1) * S.h;

    const shock = clamp(1 - (t - S.shockAt) / 1.4, 0, 1);

    const [r, g, b] = S.rgb;
    const size = CFG.pitch - CFG.gap;

    ctx.clearRect(0, 0, S.w, S.h);
    ctx.globalCompositeOperation = "lighter";

    /* Se dibuja agrupando por escalon de brillo: cuatro cambios de
       fillStyle por fotograma en vez de uno por celda. Con 3.000
       celdas esa sola diferencia es la que separa 60 fps de 25. */
    for (let level = 1; level <= CFG.levels; level++) {
      const lo = (level - 1) / CFG.levels;
      const hi = level / CFG.levels;
      const alpha = CFG.maxAlpha * (level / CFG.levels) ** 1.6;

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.beginPath();

      for (let row = 0; row < S.rows; row++) {
        const cy = row * CFG.pitch;
        for (let col = 0; col < S.cols; col++) {
          const cx = col * CFG.pitch;

          const m = maskAt(cx + size / 2, cy + size / 2);
          if (m <= 0.01) continue;

          let v = field(col + drift, row, z);
          v = (v - cut) / (1 - cut);
          if (v <= 0) continue;

          /* Centelleo: solo donde YA hay luz. Aplicarlo a todo el
             campo enciende celdas muertas al azar y ahi vuelve la
             nieve de televisor. */
          if (tension > 0.02) {
            v *= 1 - tension * 0.55 * hash3(col, row, Math.floor(t * (6 + tension * 14)));
          }

          v *= m * (0.55 + valence * 0.55) * (1 - fatigue * 0.5);

          /* Chispas: celdas sueltas a tope, mas frecuentes con
             tension. Son las que dan la sensacion de que la
             pantalla esta viva y no en bucle. */
          if (hash3(col, row, Math.floor(t * 30)) < CFG.sparkChance * (0.3 + tension * 3)) {
            v = 1;
          }

          /* Barrido y sacudida encienden de mas, sin cambiar el
             campo: son sucesos, no estado. */
          const dy = Math.abs(cy - sweepY);
          if (dy < 26) v += (1 - dy / 26) * 0.45;
          if (shock > 0) v += shock * 0.35 * m;

          if (v <= lo || v > hi) continue;
          ctx.rect(cx, cy, size, size);
        }
      }
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function loop(now) {
    S.raf = requestAnimationFrame(loop);
    if (!S.visible || !S.onScreen) return;
    if (now - S.last < 1000 / CFG.fps) return;
    S.last = now;
    readAxes();
    draw(now);
  }

  /* Un fotograma quieto para quien ha pedido menos movimiento.
     Apagarlo del todo dejaria un hueco negro donde el resto ve
     una pantalla; congelarlo conserva la imagen sin el parpadeo. */
  function drawStill() {
    readAxes();
    S.aShown = S.arousal; S.tShown = 0;
    S.fShown = S.fatigue; S.vShown = S.valence;
    draw(4000);
  }

  function start() {
    if (!mount()) return;

    S.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

    window.addEventListener("resize", () => {
      resize();
      if (S.reduced) drawStill();
    }, { passive: true });

    if (typeof ResizeObserver === "function") {
      new ResizeObserver(() => {
        resize();
        if (S.reduced) drawStill();
      }).observe(S.el);
    }

    /* La sacudida ya existe: hero-rig.js pone `wm-shock` en el
       escenario cuando el indice se mueve de golpe. La pantalla se
       engancha a esa señal en vez de inventarse otra. */
    if (typeof MutationObserver === "function") {
      new MutationObserver(() => {
        if (S.el.classList.contains("wm-shock")) S.shockAt = performance.now() / 1000;
      }).observe(S.el, { attributes: true, attributeFilter: ["class", "data-mood"] });
    }

    document.addEventListener("visibilitychange", () => {
      S.visible = !document.hidden;
    });

    if (typeof IntersectionObserver === "function") {
      new IntersectionObserver((entries) => {
        S.onScreen = entries.some((e) => e.isIntersecting);
      }, { rootMargin: "80px" }).observe(S.el);
    }

    if (S.reduced) { drawStill(); return; }
    S.raf = requestAnimationFrame(loop);
  }

  /* El escenario puede no existir todavia: script.js pinta parte
     de la seccion. En vez de adivinar un retardo, se espera. */
  function boot() {
    if (disabled()) return;
    if (stage()) { start(); return; }
    const wait = new MutationObserver(() => {
      if (stage()) { wait.disconnect(); start(); }
    });
    wait.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* Gancho para el banco de pruebas. En produccion no lo llama
     nadie: la pagina real escribe los ejes en el escenario. */
  window.WM_MOOD_LED = { CFG, state: S, redraw: drawStill };
})();
