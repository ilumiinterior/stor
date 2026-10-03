import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "dist-editor/**",
      "node_modules/**",
      ".verification/**",
    ],
  },
  ...ts.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
