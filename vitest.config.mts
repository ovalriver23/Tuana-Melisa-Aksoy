import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Unit tests cover `core`, which is plain TypeScript and needs no browser.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
