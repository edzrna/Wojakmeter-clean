/* ===========================================================
   WOJAKMETER — ORGANISM CORE  v2
   Un motor de emoción vivo: respira, se agita, se cansa.

   Next.js — en pages/index.js, despues del Script de script.js:
     <Script src="/script.js?v=11" strategy="afterInteractive" />
     <Script src="/wm-organism.js?v=2" strategy="afterInteractive" />

   No reemplaza tu lógica de datos. Se monta encima y convierte
   los scores discretos en un estado continuo que late.
   =========================================================== */

(function () {
  "use strict";

  // ===============================
  // MODELO EMOCIONAL
  // ===============================
  /*
    Tu sistema actual tiene UNA dimensión: score 0-100.
    Una emoción real tiene DOS:

      valence  → qué tan bueno/malo se siente  (0-100)
      arousal  → qué tan ACTIVADO está el mercado (0-100)

    Score 50 con arousal 5  = mercado dormido, aburrido.
    Score 50 con arousal 95 = mercado en guerra civil, empatado.

    Son estados completamente distintos y ahora mismo tu página
    los dibuja igual. Eso es lo que mata la sensación de vida.
  */

  const WM = {
    // Estado objetivo (a dónde quiere llegar)
    target: { valence: 50, arousal: 20 },

    // Estado mostrado (dónde está ahora — persigue al target)
    current: { valence: 50, arousal: 20 },

    // Energía inyectada por eventos discretos (trades, votos, velas)
    // Decae sola. Esto es el "susto" del organismo.
    impulse: 0,

    // Fatiga: sube cuando hay mucha actividad sostenida.
    // Un mercado que lleva 3 horas en pánico reacciona MENOS
    // al siguiente golpe. Como un humano.
    fatigue: 0,

    // Ritmo cardíaco derivado
    bpm: 60,
    phase: 0,

    lastFrame: performance.now(),
    running: false,
    subscribers: []
  };

  // ===============================
  // CONSTANTES DE PERSONALIDAD
  // ===============================
  const CFG = {
    // Qué tan rápido el estado mostrado persigue al objetivo.
    // Bajo = pesado, majestuoso. Alto = nervioso, saltón.
    valenceEase: 0.9,    // unidades/segundo aprox
    arousalEase: 2.2,    // arousal reacciona más rápido que valence

    impulseDecay: 1.6,   // qué tan rápido se olvida un susto
    fatigueRise: 0.08,
    fatigueFall: 0.22,
    fatigueMax: 0.65,    // máximo 65% de amortiguación

    bpmMin: 42,
    bpmMax: 165,

    // Histéresis: cuánto tiene que cruzar un umbral para cambiar
    // de mood. Evita el parpadeo en los bordes (59↔60↔59...).
    hysteresis: 2.5
  };

  // ===============================
  // MOOD CON HISTÉRESIS
  // ===============================
  const MOOD_BANDS = [
    { key: "frustration", name: "Frustration", min: 0,  max: 20  },
    { key: "concern",     name: "Concern",     min: 20, max: 35  },
    { key: "doubt",       name: "Doubt",       min: 35, max: 45  },
    { key: "neutral",     name: "Neutral",     min: 45, max: 60  },
    { key: "optimism",    name: "Optimism",    min: 60, max: 70  },
    { key: "content",     name: "Content",     min: 70, max: 85  },
    { key: "euphoria",    name: "Euphoria",    min: 85, max: 101 }
  ];

  let _lockedMoodKey = "neutral";

  function resolveMoodStable(valence) {
    const current = MOOD_BANDS.find((b) => b.key === _lockedMoodKey);

    // Si seguimos cómodamente dentro de la banda actual, no cambiamos.
    if (current) {
      const lo = current.min - CFG.hysteresis;
      const hi = current.max + CFG.hysteresis;
      if (valence >= lo && valence < hi) {
        return current;
      }
    }

    const next = MOOD_BANDS.find((b) => valence >= b.min && valence < b.max)
      || MOOD_BANDS[3];

    _lockedMoodKey = next.key;
    return next;
  }

  // ===============================
  // ENTRADA: el mundo empuja al organismo
  // ===============================

  /**
   * Fija hacia dónde tiende la emoción. Llamar cuando llegan
   * datos nuevos (loadGlobalMarket, loadSentiment, etc).
   */
  function setTarget(valence, arousal) {
    if (Number.isFinite(valence)) {
      WM.target.valence = clamp01to100(valence);
    }
    if (Number.isFinite(arousal)) {
      WM.target.arousal = clamp01to100(arousal);
    }
  }

  /**
   * Golpe puntual. Un trade grande, un voto, una vela violenta.
   * strength 0..1. Esto es lo que hace que se sienta VIVO —
   * el organismo se sobresalta y luego se recupera.
   */
  function impulse(strength = 0.5, valenceBias = 0) {
    const damped = strength * (1 - WM.fatigue);

    WM.impulse = Math.min(1.4, WM.impulse + damped);

    // Un golpe también empuja momentáneamente la valencia
    if (valenceBias) {
      WM.current.valence = clamp01to100(
        WM.current.valence + valenceBias * damped * 9
      );
    }

    // Y siempre sube el arousal — algo pasó
    WM.current.arousal = clamp01to100(
      WM.current.arousal + damped * 28
    );
  }

  // ===============================
  // EL LATIDO — corre cada frame
  // ===============================
  function tick(now) {
    if (!WM.running) return;

    const dt = Math.min(0.1, (now - WM.lastFrame) / 1000);
    WM.lastFrame = now;

    // --- Perseguir el objetivo ---
    WM.current.valence = approach(
      WM.current.valence,
      WM.target.valence,
      CFG.valenceEase * dt * 10
    );

    // El arousal decae hacia su objetivo, pero el impulso lo sostiene
    const arousalTarget = clamp01to100(
      WM.target.arousal + WM.impulse * 35
    );

    WM.current.arousal = approach(
      WM.current.arousal,
      arousalTarget,
      CFG.arousalEase * dt * 10
    );

    // --- Decaimiento del impulso ---
    WM.impulse = Math.max(0, WM.impulse - CFG.impulseDecay * dt);

    // --- Fatiga: sube con arousal alto sostenido ---
    const arousalNorm = WM.current.arousal / 100;
    if (arousalNorm > 0.6) {
      WM.fatigue = Math.min(
        CFG.fatigueMax,
        WM.fatigue + CFG.fatigueRise * dt * (arousalNorm - 0.6) * 3
      );
    } else {
      WM.fatigue = Math.max(0, WM.fatigue - CFG.fatigueFall * dt);
    }

    // --- Ritmo cardíaco ---
    // Arousal manda. Valencia extrema (pánico o euforia) acelera.
    const extremity = Math.abs(WM.current.valence - 50) / 50;
    const bpmNorm = clamp(arousalNorm * 0.72 + extremity * 0.28, 0, 1);
    WM.bpm = CFG.bpmMin + bpmNorm * (CFG.bpmMax - CFG.bpmMin);

    // Fase del latido: avanza según bpm. Esto da la pulsación real.
    WM.phase += (WM.bpm / 60) * dt;
    if (WM.phase > 1) WM.phase -= Math.floor(WM.phase);

    paint();
    WM.subscribers.forEach((fn) => {
      try { fn(snapshot()); } catch (e) { console.error("WM subscriber:", e); }
    });

    requestAnimationFrame(tick);
  }

  // ===============================
  // SALIDA: pintar el estado en CSS
  // ===============================
  /*
    En vez de que cada módulo JS toque el DOM, el organismo
    publica su estado como variables CSS en <body>.
    El CSS decide cómo se ve. Un solo punto de escritura,
    60fps, sin thrashing de layout.
  */
  function paint() {
    const body = document.body;
    if (!body) return;

    const mood = resolveMoodStable(WM.current.valence);
    const beat = heartbeatCurve(WM.phase);

    const s = body.style;

    s.setProperty("--wm-valence",   WM.current.valence.toFixed(2));
    s.setProperty("--wm-arousal",   WM.current.arousal.toFixed(2));
    s.setProperty("--wm-impulse",   WM.impulse.toFixed(3));
    s.setProperty("--wm-fatigue",   WM.fatigue.toFixed(3));
    s.setProperty("--wm-bpm",       WM.bpm.toFixed(1));
    s.setProperty("--wm-beat",      beat.toFixed(4));

    // Escala derivada del latido — el sístole/diástole visual
    s.setProperty("--wm-pulse-scale", (1 + beat * 0.028 * (0.4 + WM.current.arousal / 140)).toFixed(4));

    // Intensidad de glow: arousal + impulso
    s.setProperty("--wm-glow", (WM.current.arousal / 100 * 0.7 + WM.impulse * 0.5).toFixed(3));

    // Color emocional interpolado — sin saltos entre moods
    s.setProperty("--wm-color", valenceToColor(WM.current.valence));

    if (body.dataset.wmMood !== mood.key) {
      body.dataset.wmMood = mood.key;
      emit("moodchange", { mood, state: snapshot() });
    }

    body.dataset.wmArousal = arousalBand(WM.current.arousal);
  }

  /*
    Curva de latido real: dos picos (lub-dub), no una sinusoide.
    Esto es lo que hace que se lea como corazón y no como
    una animación de "pulse" genérica de Tailwind.
  */
  function heartbeatCurve(t) {
    const lub = Math.exp(-Math.pow((t - 0.08) / 0.045, 2));
    const dub = Math.exp(-Math.pow((t - 0.26) / 0.060, 2)) * 0.62;
    return Math.min(1, lub + dub);
  }

  function valenceToColor(v) {
    // Rojo → gris → verde, con interpolación en el espacio correcto
    const stops = [
      { at: 0,   c: [255, 59,  77]  },
      { at: 25,  c: [255, 108, 121] },
      { at: 42,  c: [255, 157, 166] },
      { at: 50,  c: [207, 215, 227] },
      { at: 62,  c: [166, 255, 196] },
      { at: 78,  c: [124, 255, 170] },
      { at: 100, c: [77,  255, 136] }
    ];

    let lo = stops[0];
    let hi = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
      if (v >= stops[i].at && v <= stops[i + 1].at) {
        lo = stops[i];
        hi = stops[i + 1];
        break;
      }
    }

    const span = hi.at - lo.at || 1;
    const f = clamp((v - lo.at) / span, 0, 1);

    const r = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * f);
    const g = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * f);
    const b = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * f);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function arousalBand(a) {
    if (a >= 78) return "frantic";
    if (a >= 55) return "active";
    if (a >= 30) return "steady";
    return "dormant";
  }

  // ===============================
  // UTILIDADES
  // ===============================
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clamp01to100(n)  { return clamp(Number(n) || 0, 0, 100); }

  function approach(from, to, maxStep) {
    const diff = to - from;
    if (Math.abs(diff) <= maxStep) return to;
    return from + Math.sign(diff) * maxStep;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`wm:${name}`, { detail }));
  }

  function snapshot() {
    return {
      valence: WM.current.valence,
      arousal: WM.current.arousal,
      impulse: WM.impulse,
      fatigue: WM.fatigue,
      bpm: WM.bpm,
      beat: heartbeatCurve(WM.phase),
      mood: resolveMoodStable(WM.current.valence),
      arousalBand: arousalBand(WM.current.arousal)
    };
  }

  // ===============================
  // PUENTES A TU CÓDIGO EXISTENTE
  // ===============================
  /*
    Envolvemos tus funciones para que alimenten al organismo
    sin que tengas que reescribirlas. Si la función no existe
    todavía, lo saltamos sin romper nada.
  */
  /*
    FIX: con Next.js <Script strategy="afterInteractive">, script.js
    puede cargar DESPUÉS de DOMContentLoaded. La v1 intentaba envolver
    funciones que aún no existían y fallaba en silencio.
    Ahora reintentamos hasta que aparezcan.
  */
  const _bridged = new Set();

  function wrap(name, wrapper) {
    if (_bridged.has(name)) return true;
    if (typeof window[name] !== "function") return false;

    const original = window[name];
    window[name] = wrapper(original);
    _bridged.add(name);
    return true;
  }

  function bridge() {
    // --- Score global -> valencia + arousal ---
    wrap("recomputeHeroSystem", (original) => function () {
      const result = original.apply(this, arguments);
      setTarget(Number(window.currentGlobalScore), deriveArousal());
      return result;
    });

    // --- Trades en vivo -> impulsos ---
    wrap("registerMoodTrade", (original) => function (rawTrade) {
      const result = original.apply(this, arguments);
      try {
        const usd = Number(rawTrade?.usdValue ?? rawTrade?.vUsd ?? 0);
        const isSell = String(
          rawTrade?.txType ?? rawTrade?.side ?? ""
        ).toLowerCase().includes("sell");

        // Escala logarítmica: $100k no debe pegar 100x más que $1k,
        // debe pegar ~2x. Si no, un solo ballena satura todo.
        const strength = clamp(Math.log10(Math.max(usd, 10)) / 5.2, 0.08, 1);
        impulse(strength, isSell ? -1 : 1);
      } catch {}
      return result;
    });

    // --- Votos del pulse -> impulsos ---
    wrap("handlePulseVote", (original) => function (moodKey) {
      const result = original.apply(this, arguments);
      const w = { frustration: -1, concern: -0.7, doubt: -0.35,
                  neutral: 0, optimism: 0.35, content: 0.7, euphoria: 1 };
      impulse(0.55, w[moodKey] ?? 0);
      return result;
    });

    return _bridged.size === 3;
  }

  function bridgeWithRetry(attempt = 0) {
    if (bridge()) return;
    if (attempt > 40) {
      console.warn(
        "WMOrganism: no encontré todas las funciones de script.js.",
        "Conectadas:", [..._bridged]
      );
      return;
    }
    setTimeout(() => bridgeWithRetry(attempt + 1), 150);
  }

  function deriveArousal() {
    const g = (name, fallback) => {
      const v = Number(window[name]);
      return Number.isFinite(v) ? v : fallback;
    };

    const market = g("currentMarketScore", 50);
    const social = g("currentSocialScore", 50);
    const pulse  = g("currentPulseScore",  50);
    const driver = g("currentDriverScore", 50);
    const change = Math.abs(g("currentGlobalChange", 0));

    // Desacuerdo entre capas = tensión
    const spread = (
      Math.abs(social - market) +
      Math.abs(pulse  - market) +
      Math.abs(driver - 50)
    ) / 3;

    // Magnitud del movimiento = energía
    const movement = clamp(change * 6, 0, 45);

    // Extremidad del sentimiento
    const extremity = Math.abs(market - 50) * 0.5;

    return clamp01to100(spread * 1.15 + movement + extremity * 0.6);
  }

  // ===============================
  // ARRANQUE
  // ===============================
  function start() {
    if (WM.running) return;
    WM.running = true;
    WM.lastFrame = performance.now();

    // Pausar cuando la pestaña está oculta — no quemamos batería
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        WM.running = false;
      } else if (!WM.running) {
        WM.running = true;
        WM.lastFrame = performance.now();
        requestAnimationFrame(tick);
      }
    });

    requestAnimationFrame(tick);
  }

  // API pública
  window.WMOrganism = {
    setTarget,
    impulse,
    snapshot,
    start,
    subscribe(fn) {
      WM.subscribers.push(fn);
      return () => {
        const i = WM.subscribers.indexOf(fn);
        if (i >= 0) WM.subscribers.splice(i, 1);
      };
    },
    config: CFG
  };

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bridgeWithRetry(); start(); });
  } else {
    bridgeWithRetry();
    start();
  }
})();
