import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    console.log("WojakMeter mounted ✅");
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#071018",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial"
    }}>
      <h1>WojakMeter Running 🚀</h1>
    </div>
  );
}