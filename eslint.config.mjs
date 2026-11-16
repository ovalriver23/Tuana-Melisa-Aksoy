import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Three layers: `ui` may use `core` and `content`; nothing flows the other way.
// See docs/ARCHITECTURE.md, section 3.
const otherLayers = (...layers) => ({
  group: layers.flatMap((layer) => [`@/${layer}/**`, `**/${layer}/**`]),
  message: "This layer must not depend on that one (docs/ARCHITECTURE.md, section 3).",
});
const noFrameworks = {
  group: ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*"],
  message: "This layer is plain TypeScript: no React, no Next.js.",
};
const noBrowser = ["window", "document", "navigator"].map((name) => ({
  name,
  message:
    "core takes the viewport and the clock as arguments, so it can be tested without a browser.",
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [noFrameworks, otherLayers("ui", "content", "app")] },
      ],
      "no-restricted-globals": ["error", ...noBrowser],
    },
  },
  {
    files: ["src/content/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [noFrameworks, otherLayers("ui", "core", "app")] },
      ],
    },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
