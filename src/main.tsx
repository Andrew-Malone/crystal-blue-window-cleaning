import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource-variable/ibm-plex-sans/wght.css";
import "./styles.css";
import App from "./App";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production builds ship #root already filled in by scripts/prerender.js, so
// attach to that markup instead of replacing it. The dev server serves it empty.
if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
