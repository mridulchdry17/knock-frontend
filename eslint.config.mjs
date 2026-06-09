import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * Flat config. Goals:
 *  - TS strict-ish without crushing every dev-time WIP warning into an error
 *  - React hooks correctness (real bugs, gate the build on these)
 *  - no-unused-vars warns; underscore-prefixed args / vars are intentional
 *  - test files exempted from a couple of noisy rules
 */

const sharedReactSettings = {
  react: { version: "detect" },
};

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    settings: sharedReactSettings,
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      // React 17+ JSX transform — no React-in-scope requirement.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Hooks correctness — real bugs.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Allow the `Foo extends BarProps {}` empty-interface pattern (we use it
      // for several UI primitives so consumers can extend later).
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      // _-prefix escape hatch.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off",
    },
  },
  {
    // Tests: looser. Vitest globals come via tsconfig types; we just don't
    // want hooks-deps lint failing on inline mocks.
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
