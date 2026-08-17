/* ===========================================================
   HERO PROFILES — la lente, no la medicion

   REGLA QUE NO SE ROMPE:
   El indice canonico es UNO. Un 62 es 62 para todo el mundo, es el
   que se guarda en el historico, el que se comparte y el que
   aparece en la interfaz como dato.

   Un perfil NO cambia ese numero. Cambia como el personaje lo
   INTERPRETA: la cara, la postura, la intensidad. Moon Boy a 62
   esta eufórico y The Veteran a 62 apenas levanta una ceja, pero
   los dos estan mirando el mismo 62.

   En cuanto un perfil pudiera alterar el numero, el indice deja de
   ser una medicion y se convierte en un juguete —y ahi se pierde
   justo la credibilidad que el motor del indice intenta ganar.

   Por eso computeIndex() y applyProfile() son dos funciones
   separadas en dos archivos separados, y la segunda nunca devuelve
   nada que se escriba en la base de datos.
   =========================================================== */

import { clamp, moodFromScore } from "./market-index.js";

function tanh(x) {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

/* ---------------------------------------------------------
   LOS PERFILES

   gain      — cuanto amplifica la distancia respecto a 50
   bias      — desplazamiento permanente en puntos
   floor/ceil— limites: nunca baja/sube de ahi
   asym      — trato distinto a subidas y bajadas (1 = simetrico)
   arousalK  — cuanto le altera el movimiento
   fatigueK  — cuanto le pesa que no pase nada
   tensionK  — cuanto le afecta la contradiccion entre senales
   --------------------------------------------------------- */
export const PROFILES = {
  straight: {
    id: "straight",
    name: "Straight Read",
    tagline: "The index, unfiltered.",
    blurb: "No lens. What the market says is what the face shows.",
    /* identity: pasa el indice tal cual, sin curva.

       Con gain 1 la tanh seguia comprimiendo y un indice 0 salia
       como 10, un 100 como 90. Este perfil ES el indice, asi que
       no puede tocarlo ni un punto: cualquier otra cosa seria
       decir que el numero canonico necesita correccion. */
    identity: true,
    gain: 1, bias: 0, floor: 0, ceil: 100, asym: 1,
    arousalK: 1, fatigueK: 1, tensionK: 1
  },

  moonboy: {
    id: "moonboy",
    name: "Moon Boy",
    tagline: "Everything is either the top or the bottom.",
    blurb: "Lives at the extremes. A green hour is a bull run; a red one is the end.",
    /* Gain alto y suelo/techo abiertos: es el unico perfil que
       toca los dos extremos de la escala con frecuencia. */
    gain: 2.1, bias: 4, floor: 0, ceil: 100, asym: 1.15,
    arousalK: 1.6, fatigueK: 0.35, tensionK: 0.7
  },

  cryptobro: {
    id: "cryptobro",
    name: "Crypto Bro",
    tagline: "Wagmi. Zoom out.",
    blurb: "Structurally bullish. Bad news is an accumulation opportunity.",
    /* El suelo en 38 es el perfil entero: nunca cae por debajo de
       Doubt pase lo que pase. */
    gain: 0.95, bias: 14, floor: 38, ceil: 100, asym: 0.62,
    arousalK: 1.15, fatigueK: 0.6, tensionK: 0.5
  },

  paperhands: {
    id: "paperhands",
    name: "Paper Hands",
    tagline: "Sells the wick, buys the top.",
    blurb: "Asymmetric. Down moves hit twice as hard as up moves.",
    /* asym 2.4: la misma distancia cuenta mas del doble si es
       hacia abajo. Es el perfil que mejor retrata a la mayoria. */
    /* asym 1.9 y no 2.4: a 2.4 se pegaba al cero y dejaba de
       distinguir entre un mercado malo y uno catastrofico. Sigue
       siendo el perfil que mas castiga las bajadas. */
    gain: 1.15, bias: -5, floor: 4, ceil: 88, asym: 1.9,
    arousalK: 1.8, fatigueK: 0.9, tensionK: 1.7
  },

  veteran: {
    id: "veteran",
    name: "The Veteran",
    tagline: "Seen this one before.",
    blurb: "Four cycles deep. It takes a lot to move this face.",
    /* Gain bajo y fatiga alta: se aburre antes que nadie y solo
       reacciona a lo que de verdad es grande. */
    gain: 0.5, bias: 0, floor: 22, ceil: 82, asym: 1,
    arousalK: 0.45, fatigueK: 1.7, tensionK: 0.8
  }
};

export const PROFILE_ORDER = ["straight", "moonboy", "cryptobro", "paperhands", "veteran"];

export function getProfile(id) {
  return PROFILES[id] || PROFILES.straight;
}

/* ---------------------------------------------------------
   LA LENTE

   Toma el indice canonico y devuelve el score EXPRESIVO: el que
   decide que cara se pone. No sustituye al canonico en ningun
   sitio donde se muestre un dato.
   --------------------------------------------------------- */
export function applyProfile(canonicalScore, profileId) {
  const p = getProfile(profileId);

  /* El perfil canonico no pasa por la curva. */
  if (p.identity) return Math.round(clamp(canonicalScore, 0, 100));

  const d = (canonicalScore - 50) / 50;              // -1..1

  /* Asimetria: las bajadas pueden pesar mas o menos que las
     subidas segun el perfil. */
  const weighted = d < 0 ? d * p.asym : d;

  /* La curva vuelve a ser tanh para que un gain alto no se pegue
     a los topes: Moon Boy exagera, pero sigue teniendo recorrido
     entre 90 y 100. */
  const shaped = tanh(weighted * p.gain * 1.1);

  const expressive = 50 + 50 * shaped + p.bias;
  return Math.round(clamp(expressive, p.floor, p.ceil));
}

/* ---------------------------------------------------------
   LOS CUATRO EJES

   `delta` es la clave de la exageracion: el cambio del indice en
   la ultima hora. Pasar de 40 a 62 es un acontecimiento; llevar
   tres dias en 62 no lo es, aunque el numero sea identico.

   El nivel no puede producir esa diferencia —es el mismo— y por
   eso la reaccion tiene que venir de la DERIVADA. Sin este
   termino, el personaje se ve igual de excitado en un rally que
   en una meseta alta, que es exactamente lo que se sentia muerto.
   --------------------------------------------------------- */
export function deriveAxes({ canonicalScore, delta = 0, volatilityZ = 0,
                             streakSeconds = 0, disagreement = 0, profileId }) {
  const p = getProfile(profileId);
  const expressive = applyProfile(canonicalScore, profileId);

  /* Activacion: el movimiento reciente manda sobre la volatilidad. */
  const move = clamp(Math.abs(delta) / 18, 0, 1);
  const vol  = clamp(Math.abs(volatilityZ) / 2.5, 0, 1);
  const arousal = clamp((move * 0.68 + vol * 0.32) * p.arousalK, 0, 1);

  /* Fatiga: crece con la racha, se resetea con el movimiento.
     Saturada a 48 horas —mas alla, mas quieto no se puede estar. */
  const stale = clamp(streakSeconds / (48 * 3600), 0, 1);
  const fatigue = clamp(stale * p.fatigueK * (1 - move * 0.85), 0, 1);

  /* Tension: cuando las senales se contradicen. El caso tipico es
     precio subiendo con amplitud negativa —sube la media, baja
     casi todo— y es justo el estado que hoy no se ve. */
  const tension = clamp(disagreement * p.tensionK, 0, 1);

  return {
    expressive,
    mood: moodFromScore(expressive),
    axes: {
      valence: clamp((expressive - 50) / 50, -1, 1),
      arousal,
      tension,
      fatigue
    }
  };
}

/* Desacuerdo entre senales, 0..1. Se calcula sobre las partes que
   devuelve computeIndex(): si retorno y amplitud apuntan a lados
   distintos, hay contradiccion. */
export function disagreementFrom(parts) {
  const vals = ["return_", "breadth", "volumeAnom", "headlines"]
    .map((k) => parts?.[k])
    .filter((v) => v !== null && Number.isFinite(v));

  if (vals.length < 2) return 0;

  const pos = vals.filter((v) => v > 0.05).length;
  const neg = vals.filter((v) => v < -0.05).length;
  if (!pos || !neg) return 0;

  /* Maximo cuando estan repartidas mitad y mitad. */
  const split = Math.min(pos, neg) / (vals.length / 2);
  const spread = Math.max(...vals) - Math.min(...vals);
  return clamp(split * 0.6 + (spread / 2) * 0.4, 0, 1);
}
