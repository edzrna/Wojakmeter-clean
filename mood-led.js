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
    pitch:       7,      // separacion de celdas en px CSS
    gap:         2,      // hueco entre celdas: hace visible la rejilla
    levels:      4,      // escalones de brillo, como un panel real
    maxAlpha:    0.55,   // brillo del borde; el contenido va enmascarado
    hole:        56,     // margen en px alrededor del heroe que queda oscuro
    holeFade:    150,    // en cuantos px sube el brillo desde el hueco
    edgeFade:    0.22,   // fraccion del borde donde el panel esta a tope
    fps:         30,     // el ojo no pide mas para esto y ahorra bateria
    fieldFps:    15,     // el campo de nubes se recalcula a la mitad
    patternStrength: 1,  // 0 = solo nubes, 1 = el patron al peso previsto
    patternFade: 1.6,    // segundos de cruce al cambiar de emocion
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

  /* ---------------------------------------------------------
     DOS ELEMENTOS DISTINTOS, Y CONVIENE NO CONFUNDIRLOS

     `host` es DONDE se pinta: la tarjeta entera de Crypto Market
     Mood. Es la superficie grande, la que hace de adorno.

     `source` es DE DONDE se lee el estado: `#heroStage`, que es
     donde hero-rig.js escribe los cuatro ejes y script.js el
     `data-mood`. Es un elemento interior y mucho mas pequeño.

     Antes eran el mismo y por eso el panel vivia dentro del
     escenario. Al separarlos, el panel puede ocupar la tarjeta
     sin que haya que mover ni una variable de sitio.
     --------------------------------------------------------- */
  function host() {
    const el = document.querySelector("[data-mood-led]")
      || document.querySelector("section.hero.card")
      || document.querySelector(".hero.card")
      || $("heroStage")
      || null;
    return el?.dataset?.moodLed === "off" ? null : el;
  }

  function source() {
    return $("heroStage")
      || document.querySelector(".wojak-stage")
      || S.el;
  }

  /* Compatibilidad: `stage()` era el nombre viejo y lo usa el
     arranque. Ahora devuelve el objetivo de pintado. */
  const stage = host;

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

  /* ===========================================================
     UN PATRON POR EMOCION

     El campo de nubes dice CUANTA luz hay; el patron dice DONDE se
     coloca. Los dos se mezclan antes del umbral, asi que el patron
     da la forma y los ejes siguen gobernando la cantidad: un
     mercado muerto en frustration enseña las mismas bandas rotas
     que uno agitado, solo que con cuatro luces en vez de media
     pantalla. Si el patron sustituyera al campo en vez de
     mezclarse, la pantalla dejaria de reaccionar y pasaria a ser
     una animacion en bucle.

     Cada funcion devuelve 0..1 y recibe:
       c, r   columna y fila
       t      segundos
       a      activacion ya suavizada (0..1)
     Y usa `S.cx/S.cy/S.radius`, el centro del heroe en celdas.

     La forma de cada una sale de lo que cuenta la emocion, no de
     lo que quedaba bonito:
     ========================================================== */
  const PATTERNS = {
    /* Bandas rotas y desplazadas: un panel con daño. Las filas
       saltan de sitio a tirones, como una señal que se corta. */
    frustration(c, r, t, a) {
      const band = Math.floor(r / 3);
      const glitch = hash3(band, Math.floor(t * (2 + a * 6)), 7);
      if (glitch > 0.86) return 0;                    // fila apagada
      const shift = (glitch - 0.5) * 26 * (0.4 + a);
      return 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((c + shift) * 0.55 + band * 1.7));
    },

    /* Gotas que CAEN. Es el mismo gesto que el sudor del sprite y
       por la misma razon: concern tiene direccion. */
    concern(c, r, t, a) {
      const lane = hash3(c, 0, 11);
      if (lane > 0.55) return 0.12;                   // calle vacia
      const speed = 2.5 + a * 6 + lane * 3;
      const drop = (r / S.rows - t * speed * 0.06 + lane) % 1;
      const d = drop < 0 ? drop + 1 : drop;
      return d < 0.16 ? 1 - d / 0.16 : 0.08;
    },

    /* Dos frentes de onda cruzados que interfieren. El moire que
       sale es, literalmente, señales mezcladas. */
    doubt(c, r, t, a) {
      const w1 = Math.sin(c * 0.42 + r * 0.16 - t * (0.5 + a));
      const w2 = Math.sin(c * 0.31 - r * 0.27 + t * (0.35 + a * 0.8));
      return 0.5 + 0.5 * w1 * w2;
    },

    /* Barrido lento y casi plano: un panel en espera. Deliberadamente
       el mas aburrido de los siete. */
    neutral(c, r, t) {
      return 0.45 + 0.22 * Math.sin(r * 0.5 - t * 0.5) + 0.1 * Math.sin(c * 0.12);
    },

    /* Ascenso. Mismo motor que la lluvia de concern, del reves y mas
       despacio: no cae, sube. */
    optimism(c, r, t, a) {
      const lane = hash3(c, 0, 23);
      if (lane > 0.62) return 0.15;
      const speed = 1.6 + a * 3.4 + lane * 2;
      const rise = (r / S.rows + t * speed * 0.05 + lane) % 1;
      const d = rise < 0 ? rise + 1 : rise;
      return d < 0.2 ? 1 - d / 0.2 : 0.1;
    },

    /* Anillos que salen del personaje, sin prisa. Respiracion. */
    content(c, r, t, a) {
      const dx = c - S.cx, dy = r - S.cy;
      const d = Math.sqrt(dx * dx + dy * dy) - S.radius;
      return 0.5 + 0.5 * Math.sin(d * 0.34 - t * (0.8 + a * 1.2));
    },

    /* Rayos que salen de la cara y giran despacio. El unico patron
       que mira al centro y no a la rejilla. */
    euphoria(c, r, t, a) {
      const dx = c - S.cx, dy = r - S.cy;
      const ang = Math.atan2(dy, dx);
      const d = Math.sqrt(dx * dx + dy * dy);
      const rays = 0.5 + 0.5 * Math.sin(ang * 14 + t * (0.6 + a * 1.4));
      const pulse = 0.5 + 0.5 * Math.sin(d * 0.22 - t * (1.6 + a * 2.4));
      return rays * 0.65 + pulse * 0.35;
    }
  };

  /* Cuanto manda el patron sobre el campo, por emocion. No todas
     quieren lo mismo: neutral casi no debe notarse —es un mercado
     sin nada que decir— y euphoria puede permitirse gritar. */
  const PATTERN_MIX = {
    frustration: 0.62,
    concern:     0.55,
    doubt:       0.50,
    neutral:     0.22,
    optimism:    0.52,
    content:     0.45,
    euphoria:    0.68
  };

  function patternAt(mood, c, r, t, a) {
    const fn = PATTERNS[mood];
    return fn ? clamp(fn(c, r, t, a), 0, 1) : 0.5;
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
    el: null, src: null, canvas: null, ctx: null,
    w: 0, h: 0, cols: 0, rows: 0, dpr: 1,
    mask: null, fieldArr: null, bucket: null, fieldAt: -1,
    mood: "neutral", rgb: [124, 134, 152],
    cx: 0, cy: 0, radius: 1,
    patFrom: "neutral", patTo: "neutral", patAt: -99,
    arousal: 0.45, tension: 0.2, fatigue: 0.2, valence: 0.5,
    // valores mostrados, que persiguen a los reales sin saltos
    aShown: 0.45, tShown: 0.2, fShown: 0.2, vShown: 0.5,
    sweepAt: -999, shockAt: -999,
    visible: true, onScreen: true, reduced: false,
    last: 0, raf: 0
  };

  function readAxes() {
    /* Los ejes NO estan en la tarjeta: estan en `#heroStage`, que
       es donde los escribe hero-rig.js. Leerlos del host daria
       siempre los valores por defecto y la pantalla no reaccionaria
       a nada — muda, sin error, que es el fallo que vigila
       smoke-led.mjs. */
    const el = S.src || S.el;
    if (!el) return;

    const cs = getComputedStyle(el);
    /* Tres de los cuatro ejes van de 0 a 1, pero `valence` va de -1
       a 1: es el score centrado en el 50. Recortarlo a 0 convertia
       todo el lado triste de la escala en el mismo valor, asi que
       la pantalla brillaba igual en frustration que en neutral.
       Se remapea a 0..1 en vez de recortarse. */
    const num = (name, def, bipolar) => {
      const v = parseFloat(cs.getPropertyValue(name));
      if (!Number.isFinite(v)) return def;
      return bipolar ? clamp((v + 1) / 2, 0, 1) : clamp(v, 0, 1);
    };

    S.arousal = num("--wm-arousal", S.arousal);
    S.tension = num("--wm-tension", S.tension);
    S.fatigue = num("--wm-fatigue", S.fatigue);
    S.valence = num("--wm-valence", S.valence, true);

    /* `data-mood` lo escribe script.js sobre el escenario, no
       hero-rig.js. Si todavia no esta, se mantiene el ultimo
       conocido en vez de caer a neutral: un parpadeo a gris cada
       vez que el DOM se adelanta se ve peor que un color viejo
       durante medio segundo. */
    const mood = el.dataset.mood || S.mood;
    if (mood !== S.mood) {
      /* El color puede saltar —lo tapa el suavizado de los ejes—
         pero el PATRON no: pasar de lluvia a rayos de un fotograma
         al siguiente se ve como un corte de emision. Se cruzan
         durante segundo y medio. */
      S.patFrom = S.mood;
      S.patTo = mood;
      S.patAt = performance.now() / 1000;

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
    S.src = source() || el;
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

    const n = S.cols * S.rows;
    S.mask     = new Float32Array(n);
    S.fieldArr = new Float32Array(n);
    S.bucket   = new Uint8Array(n);
    S.fieldAt  = -1;
    buildMask();
  }

  /* ---------------------------------------------------------
     LA MASCARA, CALCULADA UNA VEZ

     Antes salia por celda y por fotograma: una raiz cuadrada y dos
     divisiones multiplicadas por 22.000 celdas, 30 veces por
     segundo, para un valor que no cambia hasta que cambia el
     tamaño. Ahora se guarda en un array al redimensionar.

     Y ya no es un circulo en el centro de la tarjeta. El hueco
     oscuro se recorta EXACTAMENTE donde esta el heroe, midiendo su
     caja dentro de la tarjeta. Asi el adorno rodea al personaje
     aunque la maquetacion cambie, que en movil cambia mucho.
     --------------------------------------------------------- */
  function buildMask() {
    if (!S.mask || !S.el) return;

    const card = S.el.getBoundingClientRect();
    const sr = S.src ? S.src.getBoundingClientRect() : null;

    // caja del heroe en coordenadas de la tarjeta
    const hx0 = sr ? sr.left - card.left - CFG.hole : S.w * 0.3;
    const hy0 = sr ? sr.top  - card.top  - CFG.hole : S.h * 0.3;
    const hx1 = sr ? sr.right  - card.left + CFG.hole : S.w * 0.7;
    const hy1 = sr ? sr.bottom - card.top  + CFG.hole : S.h * 0.7;

    const edge = Math.min(S.w, S.h) * CFG.edgeFade;

    for (let row = 0; row < S.rows; row++) {
      const cy = row * CFG.pitch + CFG.pitch / 2;
      for (let col = 0; col < S.cols; col++) {
        const cx = col * CFG.pitch + CFG.pitch / 2;

        /* Distancia a la caja del heroe: 0 dentro, y creciendo
           hacia fuera. Es la distancia a un rectangulo, no a un
           punto, para que el hueco tenga la forma del contenido. */
        const dx = Math.max(hx0 - cx, 0, cx - hx1);
        const dy = Math.max(hy0 - cy, 0, cy - hy1);
        const d = Math.sqrt(dx * dx + dy * dy);
        let m = clamp(d / CFG.holeFade, 0, 1);

        /* Y ademas sube hacia los bordes de la tarjeta, para que el
           panel se lea como marco y no como fondo plano. */
        const eb = Math.min(cx, cy, S.w - cx, S.h - cy);
        m *= 0.55 + 0.45 * (1 - clamp(eb / edge, 0, 1));

        S.mask[row * S.cols + col] = m;
      }
    }

    /* Centro del heroe en coordenadas de CELDA. Los patrones
       radiales —anillos, rayos— tienen que salir de la cara, no del
       centro geometrico de la tarjeta: si salen del centro de la
       tarjeta, en movil el personaje queda descolocado respecto a
       sus propios rayos. */
    S.cx = ((hx0 + hx1) / 2) / CFG.pitch;
    S.cy = ((hy0 + hy1) / 2) / CFG.pitch;
    S.radius = Math.max(hx1 - hx0, hy1 - hy0) / 2 / CFG.pitch;
  }

  /* El campo de nubes se recalcula a MITAD de fotogramas. Es lo
     lento (dos octavas de ruido por celda) y es lo que menos
     cambia: son nubes derivando, no parpadeo. El centelleo, las
     chispas y el barrido si van a cada fotograma, porque de ellos
     depende que la pantalla parezca viva. */
  function computeField(t, arousal, fatigue, cut) {
    const speed = (0.05 + arousal * 0.20) * (1 - fatigue * 0.45);
    const drift = t * CFG.driftX * (1 + arousal * 2.2) * 60;
    const z = t * speed;
    const inv = 1 / (1 - cut);

    /* Cruce entre el patron viejo y el nuevo. Fuera de esa ventana
       solo se evalua uno, que es el caso normal y el barato. */
    const fade = clamp((t - S.patAt) / CFG.patternFade, 0, 1);
    const crossing = fade < 1 && S.patFrom !== S.patTo;
    const mixTo = (PATTERN_MIX[S.patTo] ?? 0.4) * CFG.patternStrength;
    const mixFrom = (PATTERN_MIX[S.patFrom] ?? 0.4) * CFG.patternStrength;

    for (let row = 0; row < S.rows; row++) {
      const base = row * S.cols;
      for (let col = 0; col < S.cols; col++) {
        const i = base + col;
        if (S.mask[i] <= 0.01) { S.fieldArr[i] = 0; continue; }
        const nube = field(col + drift, row, z);

        /* El campo dice CUANTA luz hay; el patron dice DONDE. Se
           mezclan ANTES del umbral, asi que el patron da la forma y
           los ejes siguen gobernando la cantidad: un mercado muerto
           en frustration enseña las mismas bandas rotas que uno
           agitado, solo que con cuatro luces. */
        let raw;
        if (crossing) {
          const a = patternAt(S.patFrom, col, row, t, arousal);
          const b = patternAt(S.patTo, col, row, t, arousal);
          const pat = a + (b - a) * fade;
          const mix = mixFrom + (mixTo - mixFrom) * fade;
          raw = nube * (1 - mix) + pat * mix;
        } else {
          raw = nube * (1 - mixTo) + patternAt(S.patTo, col, row, t, arousal) * mixTo;
        }

        const v = (raw - cut) * inv;
        S.fieldArr[i] = v > 0 ? v : 0;
      }
    }
  }

  function draw(now) {
    const ctx = S.ctx;
    if (!ctx || !S.cols || !S.mask) return;

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

    if (t - S.fieldAt >= 1 / CFG.fieldFps) {
      computeField(t, arousal, fatigue, cut);
      S.fieldAt = t;
    }

    /* Barrido de refresco: una banda que cruza de arriba abajo
       cada pocos segundos, como el repintado de un panel de
       verdad. Es lo que convence al ojo de que es una PANTALLA. */
    if (t - S.sweepAt > CFG.sweepEvery) S.sweepAt = t;
    const sweepY = ((t - S.sweepAt) / 1.1) * S.h;

    const shock = clamp(1 - (t - S.shockAt) / 1.4, 0, 1);

    const brillo = (0.55 + valence * 0.55) * (1 - fatigue * 0.5);
    const flickSeed = Math.floor(t * (6 + tension * 14));
    const sparkSeed = Math.floor(t * 30);
    const sparkP = CFG.sparkChance * (0.3 + tension * 3);
    const levels = CFG.levels;

    /* UNA sola pasada calcula el nivel de cada celda. Antes el
       bucle se repetia una vez por escalon de brillo, asi que todo
       el trabajo por celda se hacia cuatro veces para quedarse con
       una cuarta parte. Con 22.000 celdas eso eran 10 ms por
       fotograma; ahora son menos de dos. */
    S.bucket.fill(0);

    for (let row = 0; row < S.rows; row++) {
      const base = row * S.cols;
      const cy = row * CFG.pitch;
      const dy = Math.abs(cy - sweepY);
      const sweepAdd = dy < 26 ? (1 - dy / 26) * 0.45 : 0;

      for (let col = 0; col < S.cols; col++) {
        const i = base + col;
        const m = S.mask[i];
        if (m <= 0.01) continue;

        let v = S.fieldArr[i];
        if (v <= 0 && sweepAdd === 0 && shock === 0) continue;

        /* Centelleo: solo donde YA hay luz. Aplicarlo a todo el
           campo enciende celdas muertas al azar y ahi vuelve la
           nieve de televisor. */
        if (tension > 0.02 && v > 0) {
          v *= 1 - tension * 0.55 * hash3(col, row, flickSeed);
        }

        v *= m * brillo;

        /* Chispas: celdas sueltas a tope, mas frecuentes con
           tension. Son las que dan la sensacion de que la pantalla
           esta viva y no en bucle. */
        if (hash3(col, row, sparkSeed) < sparkP) v = 1;

        /* Barrido y sacudida encienden de mas, sin tocar el campo:
           son sucesos, no estado. */
        v += sweepAdd;
        if (shock > 0) v += shock * 0.35 * m;

        if (v <= 0) continue;
        const lv = v >= 1 ? levels : Math.ceil(v * levels);
        S.bucket[i] = lv;
      }
    }

    const [r, g, b] = S.rgb;
    const size = CFG.pitch - CFG.gap;

    ctx.clearRect(0, 0, S.w, S.h);
    ctx.globalCompositeOperation = "lighter";

    for (let level = 1; level <= levels; level++) {
      const alpha = CFG.maxAlpha * (level / levels) ** 1.6;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.beginPath();

      for (let row = 0; row < S.rows; row++) {
        const base = row * S.cols;
        const cy = row * CFG.pitch;
        for (let col = 0; col < S.cols; col++) {
          if (S.bucket[base + col] !== level) continue;
          ctx.rect(col * CFG.pitch, cy, size, size);
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
