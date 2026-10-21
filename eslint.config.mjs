// Root ESLint flat config for the whole workspace. No package carries its own ESLint config.
// INFRASTRUCTURE: excluded from layer labelling entirely (structure.md). It carries the plugin
// namespace, which must equal the package scope, and the exclusion grants it nothing.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import parth from "./tooling/eslint/parth-plugin.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, "app" | "service" | "shared">} */
const KIND_BY_TOP = { apps: "app", services: "service", packages: "shared" };

/**
 * Package table for parth/no-cross-package-import, read at config load from
 * apps/*, services/* and packages/* manifests. `dir` is root-relative, e.g. "services/gateway".
 * @returns {{ dir: string, name: string, kind: "app" | "service" | "shared" }[]}
 */
function loadPackages() {
  const packages = [];
  for (const [top, kind] of Object.entries(KIND_BY_TOP)) {
    const topDir = path.join(rootDir, top);
    if (!existsSync(topDir)) continue;
    for (const entry of readdirSync(topDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(topDir, entry.name, "package.json");
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (typeof manifest.name !== "string") continue;
      packages.push({ dir: `${top}/${entry.name}`, name: manifest.name, kind });
    }
  }
  return packages;
}

const packages = loadPackages();

export default defineConfig([
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "apps/app/.expo/",
      "apps/app/expo-env.d.ts",
      "pnpm-lock.yaml",
      ".env.example",
      "docs/",
      ".kiro/",
      "coverage/",
      // Local portable Node/pnpm toolchain, not project source.
      ".tools/",
      ".reference/",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
  },
  {
    // babel.config.js, metro.config.js, tailwind.config.js
    files: ["**/*.{js,cjs}"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.mjs", "**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/admin/src/**", "apps/admin/test/**"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    plugins: { parth },
    rules: {
      "parth/no-cross-package-import": ["error", { rootDir, packages }],
    },
  },
]);
