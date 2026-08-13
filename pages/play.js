import Head from "next/head";
import { useEffect } from "react";

/* ===========================================================
   /play — la puerta compartible del juego

   POR QUE EXISTE ESTA RUTA:
   El enlace que reparte el juego era `wojakmeter.com/#emotionRush`,
   y el fragmento despues de la almohadilla NUNCA se envia al
   servidor. X, Telegram y Discord piden la pagina, reciben el
   `<Head>` de la portada y pintan la tarjeta generica del indice:
   un enlace a una herramienta de datos, no a un juego. El poster
   no aparecia por ningun lado.

   Con una ruta propia el rastreador recibe metadatos propios. La
   persona no se queda aqui: se la manda al juego de inmediato.

   No es una pagina duplicada ni contenido paralelo que mantener
   —el canonical apunta a la portada— sino una tarjeta de
   presentacion con redireccion.
   =========================================================== */

const SITE = "https://wojakmeter.com";
const POSTER = `${SITE}/assets/game/emotion-rush-og.jpg`;

export default function Play() {
  useEffect(() => {
    /* replace y no assign: el rebote no debe quedarse en el
       historial, o el boton "atras" devuelve aqui y vuelve a
       rebotar. */
    window.location.replace(`${SITE}/?play=1#emotionRush`);
  }, []);

  return (
    <>
      <Head>
        <title>Emotion Rush — WojakMeter</title>
        <meta
          name="description"
          content="Read the crypto market's mood before the clock runs out. Three lives, one leaderboard."
        />

        {/* El canonical manda a la portada: esta ruta no compite en
            el buscador con la pagina real, solo reparte enlaces. */}
        <link rel="canonical" href={SITE} />

        {/* Por si el JavaScript no corre —algunos navegadores de
            dentro de apps lo bloquean— la redireccion tambien va
            declarada aqui. Dos segundos: los rastreadores leen los
            metadatos antes y una persona no llega a notarlo. */}
        <meta httpEquiv="refresh" content={`2; url=${SITE}/?play=1#emotionRush`} />

        <meta property="og:title" content="Emotion Rush — can you read the market faster than it moves?" />
        <meta
          property="og:description"
          content="A number appears. Tap the face that matches it. Every hit makes the next one faster."
        />
        <meta property="og:image" content={POSTER} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={`${SITE}/play`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="WojakMeter" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Emotion Rush — WojakMeter" />
        <meta
          name="twitter:description"
          content="Read the crypto market's mood before the clock runs out."
        />
        <meta name="twitter:image" content={POSTER} />
        <meta name="twitter:site" content="@wojakmeterx" />
      </Head>

      {/* Se ve durante una fraccion de segundo. Sin esto, el rebote
          muestra una pagina en blanco que parece un error. */}
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05080C",
          color: "#E8E9EC",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.8rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase"
        }}
      >
        <a href={`${SITE}/?play=1#emotionRush`} style={{ color: "inherit" }}>
          Loading Emotion Rush…
        </a>
      </main>
    </>
  );
}
