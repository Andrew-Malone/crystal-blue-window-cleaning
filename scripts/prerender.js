// Runs after both Vite builds (see "build" in package.json). Bakes the
// rendered page into dist/index.html so the browser paints real content
// before any JavaScript runs, and preloads the fonts and hero photo the first
// screen needs so they arrive with (not after) that first paint.
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist`;
const serverBuild = `${root}dist-server`;

const { render } = await import(`${serverBuild}/entry-server.js`);

// Vite names emitted assets `<name>-<hash>.<ext>`; find each by its name.
const assets = readdirSync(`${dist}/assets`);
function asset(pattern) {
  const matches = assets.filter((file) => pattern.test(file));
  if (matches.length !== 1) {
    throw new Error(`prerender: expected one asset matching ${pattern}, found ${matches.length}`);
  }
  return `/assets/${matches[0]}`;
}

const preloads = [
  `<link rel="preload" as="image" href="${asset(/^pensacola-bay-[\w-]+\.webp$/)}" fetchpriority="high" />`,
  ...[
    /^playfair-display-latin-700-normal-[\w-]+\.woff2$/,
    /^ibm-plex-sans-latin-wght-normal-[\w-]+\.woff2$/,
    /^bitter-latin-wght-normal-[\w-]+\.woff2$/,
  ].map(
    (pattern) =>
      `<link rel="preload" as="font" type="font/woff2" href="${asset(pattern)}" crossorigin />`,
  ),
];

const indexPath = `${dist}/index.html`;
let html = readFileSync(indexPath, "utf8");

const emptyRoot = '<div id="root"></div>';
const firstScript = '<script type="module"';
if (!html.includes(emptyRoot) || !html.includes(firstScript)) {
  throw new Error("prerender: dist/index.html is missing the root div or module script");
}

html = html
  .replace(firstScript, `${preloads.join("\n    ")}\n    ${firstScript}`)
  .replace(emptyRoot, `<div id="root">${render()}</div>`);

writeFileSync(indexPath, html);
rmSync(serverBuild, { recursive: true, force: true });
console.log("prerender: wrote dist/index.html");
