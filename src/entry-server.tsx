import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

// Build-time only: scripts/prerender.js calls this once per page to bake its
// markup into dist/*.html. `path` is the URL path the page is served at.
export function render(path: string) {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  );
}
