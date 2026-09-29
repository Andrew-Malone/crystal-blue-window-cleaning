import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

// Build-time only: scripts/prerender.js calls this to bake the page's markup
// into dist/index.html.
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
