import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Strenge Content-Security-Policy nur im Build (der Dev-Server braucht Inline-Skripte).
// Erlaubt sind nur eigene Dateien und die Anthropic-API (ab M2).
const csp: Plugin = {
  name: "csp",
  apply: "build",
  transformIndexHtml(html) {
    const policy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
    ].join("; ");
    return html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
    );
  },
};

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), csp],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
