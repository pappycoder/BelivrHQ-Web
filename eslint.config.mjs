import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // These helpers run in Node and are never imported by the application.
    files: [
      "scripts/ops/**/*.cjs",
      "test/ops/**/*.cjs",
      "scripts/vercel-env.cjs",
      "scripts/check-private-env.cjs",
      "test/env/**/*.cjs",
    ],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/sw.js.map",
      "public/workbox-*.js",
      "public/worker-*.js",
    ],
  },
];

export default eslintConfig;
