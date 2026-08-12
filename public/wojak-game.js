/* ===========================================================
   EMOTION RUSH — juego de reflejos y escala emocional

   POR QUE ES UN ARCHIVO APARTE Y NO VA DENTRO DE script.js:
   script.js ya pasa de 7.000 lineas y cada bloque nuevo que se
   mete ahi aumenta la probabilidad de borrar una funcion al
   reescribir. Esto es un modulo cerrado: no exporta nada, no
   toca variables del sitio y su unico contacto con el resto de
   la pagina es leer el score global del DOM. Si se borra este
   archivo, el sitio sigue funcionando igual.

   Es un script clasico dentro de un IIFE, como script.js. No hay
   bundler, asi que nada de import/export.

   COMO SE JUEGA:
   Aparece un numero (por ejemplo 72) y una cuadricula de nueve
   caras. Hay que tocar la cara que corresponde a ese score. Se
   acelera con cada acierto. Tres vidas.

   POR QUE ASI Y NO "toca la que se ilumina":
   Un pop-it generico ya existe mil veces y no ensena nada. Este
   bucle obliga a leer la escala del sitio, que es justo lo que
   un visitante nuevo no sabe hacer. A los tres minutos de jugar
   ya reconoce las caras de un vistazo: es onboarding disfrazado
   de juego, y es la unica version del juego que solo WojakMeter
   puede construir.
   =========================================================== */

(function () {
  "use strict";

  const ROOT_ID = "emotionRush";
  if (!document.getElementById(ROOT_ID)) return;

  /* ---------------------------------------------------------
     ESPEJO DE script.js

     Estos tres valores estan duplicados a proposito, igual que la
     formula tanh lo esta entre script.js, history-snapshot.js y
     global.js: este archivo no puede importar nada. Si cambian
     los rangos de getMoodByScore o la paleta de getMoodColor,
     hay que cambiarlos aqui.
     --------------------------------------------------------- */

  const MOODS = [
    { key: "frustration", name: "Frustration", min: 0,  max: 19,  color: "#E4485C" },
    { key: "concern",     name: "Concern",     min: 20, max: 34,  color: "#E8848F" },
    { key: "doubt",       name: "Doubt",       min: 35, max: 44,  color: "#E8B4BA" },
    { key: "neutral",     name: "Neutral",     min: 45, max: 59,  color: "#B8C0CB" },
    { key: "optimism",    name: "Optimism",    min: 60, max: 69,  color: "#A8E6BF" },
    { key: "content",     name: "Content",     min: 70, max: 84,  color: "#7FD9A0" },
    { key: "euphoria",    name: "Euphoria",    min: 85, max: 100, color: "#3BD97A" }
  ];

  const ICON_PATH = (key) => `/assets/icons/classic/${key}.png`;

  function moodByScore(score) {
    for (let i = MOODS.length - 1; i >= 0; i--) {
      if (score >= MOODS[i].min) return MOODS[i];
    }
    return MOODS[0];
  }

  /* ---------------------------------------------------------
     CURVA DE DIFICULTAD

     El tiempo por ronda baja de 2.6s a 0.9s siguiendo una curva,
     no una resta fija. Con resta fija el juego es aburrido diez
     rondas y luego imposible de golpe; con curva, cada ronda se
     siente un poco mas tensa que la anterior sin que haya un
     muro.

     El suelo de 0.9s no es arbitrario: por debajo, el limite
     deja de ser la habilidad y pasa a ser el tiempo de lectura
     del numero. Un juego que castiga por no leer rapido no es
     dificil, es injusto.
     --------------------------------------------------------- */

  const ROUND_MS_START = 2600;
  const ROUND_MS_FLOOR = 900;
  const DIFFICULTY_K   = 0.055;

  function roundDuration(round) {
    const span = ROUND_MS_START - ROUND_MS_FLOOR;
    return ROUND_MS_FLOOR + span * Math.exp(-DIFFICULTY_K * round);
  }

  /* Los aciertos seguidos valen mas, pero el multiplicador se
     corta en 5x. Sin tope, una sola partida buena vuelve
     irrelevante la tabla entera. */
  function streakMultiplier(streak) {
    return Math.min(5, 1 + Math.floor(streak / 4) * 0.5);
  }

  /* ---------------------------------------------------------
     MODOS

     "scale" es el modo principal descrito arriba.

     "mirror" es el inverso: se muestra una CARA y hay que elegir
     entre tres rangos numericos. Existe porque el modo scale se
     puede aprender de memoria por posicion, y en cuanto eso pasa
     deja de ensenar nada. Alternar los dos mantiene el
     aprendizaje real en vez de la memoria muscular.
     --------------------------------------------------------- */

  const MODES = {
    scale:  { label: "Read the score", hint: "Tap the face that matches the number" },
    mirror: { label: "Read the face",  hint: "Tap the range that matches the face" }
  };

  /* =========================================================
     ESTADO
     ========================================================= */

  const state = {
    running: false,
    over: false,
    mode: "scale",
    round: 0,
    score: 0,
    lives: 3,
    streak: 0,
    bestStreak: 0,
    target: null,
    answered: false,
    options: [],
    deadline: 0,
    rafId: null,
    timeoutId: null,
    marketScore: 50,
    marketMood: null,
    startedAt: 0,
    lastRoundMs: 0,
    reactionTimes: [],
    soundOn: true,
    audioCtx: null
  };

  const el = {};

  function $(id) { return document.getElementById(id); }

  /* =========================================================
     SONIDO Y HAPTICA

     Sin bibliotecas: tres osciladores cortos con WebAudio. Un
     archivo de audio para tres pitidos serian tres peticiones de
     red y un flash de silencio en la primera partida.

     El contexto se crea en el primer toque del usuario, no al
     cargar: los navegadores bloquean el audio iniciado sin gesto
     y dejan el contexto en "suspended" para siempre si se crea
     antes de tiempo.
     ========================================================= */

  function ensureAudio() {
    if (state.audioCtx) return state.audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      state.audioCtx = new Ctx();
    } catch {
      state.audioCtx = null;
    }
    return state.audioCtx;
  }

  function beep(freq, ms, type = "sine", gain = 0.06) {
    if (!state.soundOn) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state === "closed") return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    /* Rampa en la cola: un corte seco produce un chasquido
       audible en cada nota. */
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);

    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  }

  /* La vibracion es la mitad de la satisfaccion del juguete
     fisico. En escritorio no existe y falla en silencio. */
  function buzz(pattern) {
    if (!state.soundOn) return;
    try { navigator.vibrate?.(pattern); } catch {}
  }

  const sfxHit  = () => { beep(880, 90, "triangle", 0.05); buzz(12); };
  const sfxMiss = () => { beep(150, 220, "sawtooth", 0.05); buzz([28, 40, 28]); };
  const sfxOver = () => {
    [440, 330, 220].forEach((f, i) => setTimeout(() => beep(f, 260, "sine", 0.06), i * 130));
    buzz([50, 60, 120]);
  };

  /* =========================================================
     EL MERCADO PINTA LA PARTIDA

     El juego lee el score global del sitio y ajusta ritmo y
     color. En Euphoria arranca mas rapido y en verde; en
     Frustration va lento y rojo.

     Es lo que hace que este juego no se pueda clonar: cualquiera
     copia una cuadricula de nueve botones, nadie reproduce que la
     partida de hoy sea distinta a la de ayer sin tus datos.

     Se lee del DOM en vez de importar la variable de script.js:
     los dos son scripts clasicos y podrian compartir ambito, pero
     depender de eso ata este archivo al orden de carga. El DOM ya
     esta ahi y no se rompe si script.js cambia por dentro.
     ========================================================= */

  function readMarketScore() {
    const candidates = ["gaugeScore", "heroScore"];
    for (const id of candidates) {
      const raw = parseInt(String($(id)?.textContent || "").trim(), 10);
      if (Number.isFinite(raw) && raw >= 0 && raw <= 100) return raw;
    }
    return null;
  }

  async function syncMarket() {
    let score = readMarketScore();

    if (score === null) {
      try {
        const res = await fetch("/api/global?timeframe=24h", { headers: { accept: "application/json" } });
        const data = await res.json();
        if (Number.isFinite(data?.score)) score = data.score;
      } catch {
        score = null;
      }
    }

    state.marketScore = Number.isFinite(score) ? score : 50;
    state.marketMood = moodByScore(state.marketScore);

    const root = $(ROOT_ID);
    if (root) {
      root.dataset.marketMood = state.marketMood.key;
      root.style.setProperty("--rush-accent", state.marketMood.color);
    }

    if (el.marketTag) {
      el.marketTag.textContent = `Market: ${state.marketMood.name} ${state.marketScore}`;
    }
  }

  /* El mercado altera el ritmo de salida, no el suelo: un mercado
     eufórico no debe hacer el juego injugable. +-15%. */
  function marketPaceFactor() {
    const distance = Math.abs(state.marketScore - 50) / 50;
    return 1 - distance * 0.15;
  }

  /* =========================================================
     RONDAS
     ========================================================= */

  function pickTargetScore() {
    /* Se evitan los bordes exactos de cada rango (0, 19, 20...).
       Un 19 o un 20 obligan a recordar el limite de memoria en
       vez de leer la escala, y fallarlo se siente injusto aunque
       sea correcto. Se tira siempre al centro del rango. */
    const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const inner = Math.max(1, Math.floor((mood.max - mood.min) * 0.25));
    const lo = mood.min + inner;
    const hi = mood.max - inner;
    return { mood, score: lo + Math.floor(Math.random() * Math.max(1, hi - lo + 1)) };
  }

  function buildScaleRound() {
    const { mood, score } = pickTargetScore();

    /* Nueve casillas, siete emociones: dos se repiten. Repetir es
       mejor que dejar huecos, porque una cuadricula incompleta
       delata la respuesta por eliminacion. */
    const cells = MOODS.slice();
    while (cells.length < 9) {
      cells.push(MOODS[Math.floor(Math.random() * MOODS.length)]);
    }

    return { kind: "scale", prompt: String(score), answer: mood.key, options: shuffle(cells) };
  }

  function buildMirrorRound() {
    const { mood } = pickTargetScore();

    /* Tres opciones: la correcta y dos vecinas. Rangos lejanos
       serian regalados. */
    const index = MOODS.indexOf(mood);
    const pool = new Set([index]);
    while (pool.size < 3) {
      const offset = Math.random() < 0.5 ? -1 : 1;
      const step = 1 + Math.floor(Math.random() * 2);
      const candidate = Math.min(MOODS.length - 1, Math.max(0, index + offset * step));
      pool.add(candidate);
    }

    return {
      kind: "mirror",
      prompt: mood.key,
      answer: mood.key,
      options: shuffle([...pool].map((i) => MOODS[i]))
    };
  }

  function shuffle(list) {
    /* Fisher-Yates. `sort(() => Math.random() - 0.5)` no baraja
       uniformemente: sesga hacia el orden original. Aqui importa
       poco visualmente, pero el sitio ya tuvo un feed barajado
       asi y no conviene repetir el patron. */
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function nextRound() {
    if (!state.running) return;

    state.round += 1;

    /* Se alterna de modo cada cinco rondas a partir de la decima,
       cuando la memoria de posicion ya podria estar sustituyendo
       a la lectura. */
    if (state.round >= 10 && state.round % 5 === 0) {
      state.mode = state.mode === "scale" ? "mirror" : "scale";
    }

    const round = state.mode === "scale" ? buildScaleRound() : buildMirrorRound();
    state.target = round;
    state.options = round.options;
    state.answered = false;

    const duration = roundDuration(state.round) * marketPaceFactor();
    state.lastRoundMs = duration;
    state.deadline = performance.now() + duration;
    state.roundStartedAt = performance.now();

    renderRound();
    startClock();
  }

  function startClock() {
    cancelAnimationFrame(state.rafId);

    const tick = () => {
      if (!state.running) return;

      const left = state.deadline - performance.now();
      const pct = Math.max(0, Math.min(1, left / state.lastRoundMs));

      if (el.timerFill) el.timerFill.style.transform = `scaleX(${pct})`;

      /* Aviso visual en el ultimo 25%: el temporizador solo no se
         percibe cuando la vista esta en la cuadricula. */
      if (el.stage) el.stage.classList.toggle("rush-urgent", pct < 0.25);

      if (left <= 0) {
        timeOut();
        return;
      }

      state.rafId = requestAnimationFrame(tick);
    };

    state.rafId = requestAnimationFrame(tick);
  }

  function timeOut() {
    if (state.answered) return;
    state.answered = true;
    cancelAnimationFrame(state.rafId);
    registerMiss("Too slow");
  }

  function registerMiss(reason) {
    state.streak = 0;
    state.lives -= 1;
    sfxMiss();

    flashStage("rush-flash-miss");
    showFeedback(reason, false);
    renderHud();

    if (state.lives <= 0) {
      endGame();
      return;
    }

    state.timeoutId = setTimeout(nextRound, 620);
  }

  function registerHit() {
    const reaction = performance.now() - state.roundStartedAt;
    state.reactionTimes.push(Math.round(reaction));

    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    /* Puntos por velocidad: la fraccion de tiempo que sobro. Un
       acierto al limite vale menos que uno instantaneo, que es lo
       que empuja a jugar rapido en vez de a lo seguro. */
    const speedBonus = Math.max(0, 1 - reaction / state.lastRoundMs);
    const points = Math.round((60 + 40 * speedBonus) * streakMultiplier(state.streak));

    state.score += points;

    sfxHit();
    flashStage("rush-flash-hit");
    showFeedback(`+${points}${state.streak >= 4 ? ` · x${streakMultiplier(state.streak)}` : ""}`, true);
    renderHud();

    state.timeoutId = setTimeout(nextRound, 260);
  }

  function handleAnswer(key) {
    if (!state.running || !state.target) return;

    /* Una respuesta por ronda.

       `pointerdown` y `click` se disparan AMBOS en el mismo toque.
       Sin este cerrojo, cada toque contaba dos veces contra la
       misma ronda: dos aciertos, o un acierto y una vida perdida
       si la ronda ya habia cambiado. */
    if (state.answered) return;
    state.answered = true;

    cancelAnimationFrame(state.rafId);

    if (key === state.target.answer) {
      registerHit();
    } else {
      const right = MOODS.find((m) => m.key === state.target.answer);
      registerMiss(right ? right.name : "Miss");
    }
  }

  /* =========================================================
     RENDER
     ========================================================= */

  function renderRound() {
    const round = state.target;
    if (!round) return;

    if (el.modeLabel) el.modeLabel.textContent = MODES[state.mode].label;
    if (el.hint) el.hint.textContent = MODES[state.mode].hint;

    if (round.kind === "scale") {
      if (el.promptNumber) {
        el.promptNumber.textContent = round.prompt;
        el.promptNumber.classList.remove("hidden");
      }
      if (el.promptFace) el.promptFace.classList.add("hidden");

      el.grid.className = "rush-grid rush-grid-9";
      el.grid.innerHTML = round.options.map((mood, i) => `
        <button type="button" class="rush-cell" data-key="${mood.key}" data-index="${i}"
                style="--cell: ${mood.color}" aria-label="${mood.name}">
          <img src="${ICON_PATH(mood.key)}" alt="" draggable="false">
          <span class="rush-cell-name">${mood.name}</span>
        </button>`).join("");
    } else {
      const mood = MOODS.find((m) => m.key === round.prompt);
      if (el.promptNumber) el.promptNumber.classList.add("hidden");
      if (el.promptFace) {
        el.promptFace.classList.remove("hidden");
        el.promptFace.innerHTML =
          `<img src="${ICON_PATH(mood.key)}" alt="${mood.name}" draggable="false">`;
      }

      el.grid.className = "rush-grid rush-grid-3";
      el.grid.innerHTML = round.options.map((m) => `
        <button type="button" class="rush-cell rush-cell-range" data-key="${m.key}"
                style="--cell: ${m.color}" aria-label="${m.name}">
          <strong>${m.min}–${m.max}</strong>
          <span class="rush-cell-name">${m.name}</span>
        </button>`).join("");
    }
  }

  function renderHud() {
    if (el.score) el.score.textContent = String(state.score);
    if (el.round) el.round.textContent = String(state.round);
    if (el.streak) el.streak.textContent = state.streak > 0 ? `×${state.streak}` : "—";

    if (el.lives) {
      el.lives.innerHTML = Array.from({ length: 3 }, (_, i) =>
        `<span class="rush-life${i < state.lives ? "" : " spent"}"></span>`).join("");
    }
  }

  function flashStage(cls) {
    if (!el.stage) return;
    el.stage.classList.remove("rush-flash-hit", "rush-flash-miss");
    /* Reinicio forzado del reflow: sin esto, dos aciertos seguidos
       no vuelven a disparar la animacion porque la clase nunca
       llega a ausentarse entre frames. */
    void el.stage.offsetWidth;
    el.stage.classList.add(cls);
  }

  function showFeedback(text, good) {
    if (!el.feedback) return;
    el.feedback.textContent = text;
    el.feedback.className = `rush-feedback ${good ? "good" : "bad"} show`;
    clearTimeout(el.feedback.__t);
    el.feedback.__t = setTimeout(() => {
      el.feedback.className = "rush-feedback";
    }, 700);
  }

  /* =========================================================
     CICLO DE PARTIDA
     ========================================================= */

  async function startGame() {
    clearTimeout(state.timeoutId);
    cancelAnimationFrame(state.rafId);

    Object.assign(state, {
      running: true, over: false, mode: "scale", round: 0, score: 0,
      lives: 3, streak: 0, bestStreak: 0, reactionTimes: [], startedAt: Date.now()
    });

    ensureAudio();
    await syncMarket();

    $(ROOT_ID)?.classList.add("rush-playing");
    $(ROOT_ID)?.classList.remove("rush-over");

    renderHud();
    nextRound();
  }

  function endGame() {
    state.running = false;
    state.over = true;

    cancelAnimationFrame(state.rafId);
    clearTimeout(state.timeoutId);

    sfxOver();

    $(ROOT_ID)?.classList.remove("rush-playing");
    $(ROOT_ID)?.classList.add("rush-over");

    const avg = state.reactionTimes.length
      ? Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length)
      : 0;

    if (el.finalScore) el.finalScore.textContent = String(state.score);
    if (el.finalRounds) el.finalRounds.textContent = String(Math.max(0, state.round - 1));
    if (el.finalStreak) el.finalStreak.textContent = String(state.bestStreak);
    if (el.finalReaction) el.finalReaction.textContent = avg ? `${avg} ms` : "—";

    /* El score se comparte CON el contexto de mercado. Un numero
       pelado no dice nada de este sitio; "94 mientras el mercado
       estaba en Doubt" lleva la marca dentro del propio dato. */
    if (el.finalContext) {
      el.finalContext.textContent =
        `while the market was in ${state.marketMood?.name || "Neutral"} ${state.marketScore}`;
    }

    saveBestLocal();
    submitScore();
  }

  const BEST_KEY = "wmRushBest";

  function saveBestLocal() {
    try {
      const prev = Number(localStorage.getItem(BEST_KEY) || 0);
      if (state.score > prev) localStorage.setItem(BEST_KEY, String(state.score));
      renderBest();
    } catch {}
  }

  function renderBest() {
    try {
      const best = Number(localStorage.getItem(BEST_KEY) || 0);
      if (el.best) el.best.textContent = best ? String(best) : "—";
    } catch {}
  }

  /* ---------------------------------------------------------
     TABLA DE PUNTUACIONES

     Reutiliza la misma identidad anonima del Emotion Pulse: un
     UUID en localStorage que el servidor guarda hasheado. No hay
     cuentas ni correos.

     El envio es best-effort: si falla, la partida no se pierde
     ni se muestra un error. El leaderboard es un extra, no la
     razon de jugar.
     --------------------------------------------------------- */

  const VOTER_KEY = "wmPulseVoterId";

  function getPlayerId() {
    try {
      let id = localStorage.getItem(VOTER_KEY);
      if (id && id.length >= 16) return id;
      id = (crypto?.randomUUID?.()) ||
           `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VOTER_KEY, id);
      return id;
    } catch {
      return null;
    }
  }

  async function submitScore() {
    const player = getPlayerId();
    if (!player || state.score <= 0) return;

    const name = (el.nameInput?.value || "").trim().slice(0, 18);

    try {
      const res = await fetch("/api/game-score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player,
          name: name || null,
          score: state.score,
          rounds: Math.max(0, state.round - 1),
          bestStreak: state.bestStreak,
          marketScore: state.marketScore,
          marketMood: state.marketMood?.key || null,
          durationMs: Date.now() - state.startedAt
        })
      });
      const data = await res.json();
      if (data?.ok) {
        if (el.rank && Number.isFinite(data.rank)) {
          el.rank.textContent = `#${data.rank} of ${data.total}`;
        }
        renderLeaderboard(data.top);
      }
    } catch {}
  }

  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/game-score?window=7d");
      const data = await res.json();
      if (data?.ok) renderLeaderboard(data.top);
    } catch {}
  }

  function renderLeaderboard(rows) {
    if (!el.board || !Array.isArray(rows)) return;

    if (!rows.length) {
      el.board.innerHTML = `<li class="rush-board-empty">No scores yet this week — yours starts it.</li>`;
      return;
    }

    el.board.innerHTML = rows.map((r, i) => {
      const mood = MOODS.find((m) => m.key === r.market_mood);
      return `
        <li class="rush-board-row">
          <span class="rush-board-pos">${i + 1}</span>
          <span class="rush-board-name">${escapeHtml(r.name || "anon")}</span>
          ${mood ? `<img class="rush-board-mood" src="${ICON_PATH(mood.key)}"
                        alt="${mood.name}" title="Market was ${mood.name}">` : ""}
          <strong class="rush-board-score">${Number(r.score) || 0}</strong>
        </li>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function shareScore() {
    const mood = state.marketMood?.name || "Neutral";
    const text =
      `I scored ${state.score} on Emotion Rush while the crypto market was in ${mood} ${state.marketScore}/100.\n\n` +
      `Can you read the market's mood faster?\n\nwojakmeter.com`;

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank", "noopener,noreferrer"
    );
  }

  /* =========================================================
     ENTRADA
     ========================================================= */

  function bind() {
    el.root         = $(ROOT_ID);
    el.stage        = $("rushStage");
    el.grid         = $("rushGrid");
    el.promptNumber = $("rushPromptNumber");
    el.promptFace   = $("rushPromptFace");
    el.timerFill    = $("rushTimerFill");
    el.feedback     = $("rushFeedback");
    el.modeLabel    = $("rushModeLabel");
    el.hint         = $("rushHint");
    el.score        = $("rushScore");
    el.round        = $("rushRound");
    el.streak       = $("rushStreak");
    el.lives        = $("rushLives");
    el.best         = $("rushBest");
    el.marketTag    = $("rushMarketTag");
    el.finalScore   = $("rushFinalScore");
    el.finalRounds  = $("rushFinalRounds");
    el.finalStreak  = $("rushFinalStreak");
    el.finalReaction= $("rushFinalReaction");
    el.finalContext = $("rushFinalContext");
    el.board        = $("rushBoard");
    el.rank         = $("rushRank");
    el.nameInput    = $("rushName");

    /* Delegado: la cuadricula se reescribe cada ronda y enganchar
       nueve listeners por ronda dejaria cientos vivos en una
       partida larga. */
    el.grid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".rush-cell");
      if (btn) handleAnswer(btn.dataset.key);
    });

    /* pointerdown ademas de click: en movil, `click` llega hasta
       300ms despues del toque en algunos navegadores. En un juego
       de reflejos eso es la diferencia entre justo y roto. Se
       marca la ronda como resuelta para que el click posterior no
       cuente dos veces. */
    el.grid?.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".rush-cell");
      if (!btn || !state.running) return;
      e.preventDefault();
      handleAnswer(btn.dataset.key);
    });

    $("rushStart")?.addEventListener("click", startGame);
    $("rushRestart")?.addEventListener("click", startGame);
    $("rushShare")?.addEventListener("click", shareScore);

    $("rushSound")?.addEventListener("click", (e) => {
      state.soundOn = !state.soundOn;
      e.currentTarget.setAttribute("aria-pressed", String(state.soundOn));
      e.currentTarget.textContent = state.soundOn ? "Sound on" : "Sound off";
      if (state.soundOn) beep(660, 80);
    });

    /* Teclado: 1-9 para la cuadricula, espacio para empezar. Sin
       esto el juego es intocable en escritorio sin raton, y ademas
       lo hace mucho mas rapido de jugar para quien se engancha. */
    document.addEventListener("keydown", (e) => {
      if (!el.root || !isVisible(el.root)) return;

      if (!state.running && (e.code === "Space" || e.code === "Enter")) {
        const active = document.activeElement;
        if (active && ["INPUT", "TEXTAREA"].includes(active.tagName)) return;
        e.preventDefault();
        startGame();
        return;
      }

      if (!state.running) return;

      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        const cell = el.grid?.querySelector(`.rush-cell:nth-child(${n})`);
        if (cell) {
          e.preventDefault();
          cell.classList.add("rush-cell-kbd");
          setTimeout(() => cell.classList.remove("rush-cell-kbd"), 120);
          handleAnswer(cell.dataset.key);
        }
      }
    });

    /* Si la pestana se oculta a mitad de partida, el temporizador
       seguiria corriendo y el jugador volveria a una derrota que
       no vio ocurrir. Se pausa. */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.running) pauseGame();
    });
  }

  function pauseGame() {
    cancelAnimationFrame(state.rafId);
    clearTimeout(state.timeoutId);
    state.running = false;
    /* Se quita rush-playing y no se anade nada: el CSS muestra la
       capa de inicio con :not(.rush-playing):not(.rush-over), asi
       que volver al estado inicial es simplemente esto. */
    el.root?.classList.remove("rush-playing");
    showFeedback("Paused", false);
  }

  function isVisible(node) {
    const rect = node.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /* =========================================================
     ARRANQUE

     Nada de red hasta que la seccion esta cerca de la pantalla:
     es un juego, no puede costarle una peticion a quien nunca
     baja hasta el.
     ========================================================= */

  function init() {
    bind();
    renderBest();
    renderHud();

    const root = $(ROOT_ID);
    if (!root) return;

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          syncMarket();
          loadLeaderboard();
        });
      }, { rootMargin: "200px" });
      io.observe(root);
    } else {
      syncMarket();
      loadLeaderboard();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
