import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Two pages: the home page and the quote page. Vite serves `/quote` from
// quote.html in dev and emits dist/quote.html, which Cloudflare serves at
// /quote (its default html handling drops the extension). Paths are relative
// to the project root.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        quote: "quote.html",
      },
    },
  },
});
