import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist-extension/*", "build", "chrome", "docs", "test/cases/*", "test/fixtures/*", "coverage", ".nyc_output"],
  },
  js.configs.recommended,
  {
    "rules": {
      "dot-notation": 2,
      "max-statements-per-line": 2,
      "no-unused-vars": [2, {caughtErrors: "none"}],
    },
    languageOptions: {
      globals: {
        ...globals.node,
      }
    },
  },
  {
    // add mocha globals for test files
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
      }
    },
  }
];
