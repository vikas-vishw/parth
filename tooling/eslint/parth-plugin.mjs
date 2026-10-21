// Local ESLint plugin for repo-wide rules. INFRASTRUCTURE: excluded from layer
// labelling entirely (structure.md). Carries the plugin namespace, which must equal the
// package scope, and is granted nothing by the exclusion.
import noCrossPackageImport from "./no-cross-package-import.mjs";

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
  meta: { name: "parth" },
  rules: {
    "no-cross-package-import": noCrossPackageImport,
  },
};

export default plugin;
