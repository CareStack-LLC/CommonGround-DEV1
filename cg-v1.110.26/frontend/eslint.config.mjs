import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules to fix CI/CD issues
  {
    rules: {
      // Allow unescaped apostrophes and quotes in JSX (common in marketing copy)
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
