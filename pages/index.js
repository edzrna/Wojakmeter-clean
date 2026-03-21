import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>WojakMeter</title>

        <link rel="stylesheet" href="/style.css" />

        {/* 👇 ESTO ES LA CLAVE */}
        <script src="/script.js" defer></script>
      </Head>

      <div className="style-classic">
        <h1>WojakMeter LIVE 🚀</h1>
      </div>
    </>
  );
}