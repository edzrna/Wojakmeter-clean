import { useEffect } from "react";

// The existing engines bind to DOM elements. Run them after hydration, in a
// deterministic order; the shell must observe the first market requests.
const SCRIPTS = [
  "pro-shell.js?v=pro1",
  "script.js?v=pro1",
  "hero-rig.js?v=4",
  "bag-mood-rig.js?v=1",
  "mood-led.js?v=1",
  "wm-organism.js?v=2",
  "wojak-game.js?v=1",
];

export default function WorkspaceScripts() {
  useEffect(() => {
    if (window.__WM_WORKSPACE_LOADING__) return;
    window.__WM_WORKSPACE_LOADING__ = true;
    async function load() {
      for (const file of SCRIPTS) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `/${file}`;
          script.async = false;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Could not load ${file}`));
          document.body.appendChild(script);
        });
      }
    }
    load().catch((error) => {
      console.error(error);
      const status = document.getElementById("proConnection");
      if (status) {
        status.textContent = "Some tools could not load. Refresh to retry.";
        status.parentElement.dataset.state = "error";
      }
      const retry = document.getElementById("proRetry");
      if (retry) retry.hidden = false;
    });
  }, []);
  return null;
}
