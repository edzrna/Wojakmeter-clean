import Head from "next/head";
import "../styles/globals.css";
import "../styles/wm-organism.css";
import "../styles/legal.css";
import "../styles/about.css";


export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
} 
