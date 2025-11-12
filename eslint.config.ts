import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default [
  // global ignores
  {
    ignores: ["dist/**", "node_modules/**", "db-data/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // prettier config must be last to override other configs
  prettierConfig,
];
