import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "off",
    },
  },
  {
    files: ["src/model/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../cli/**",
                "../editor/**",
                "../io/**",
                "../planner/**",
                "../protocol/**",
                "../ui/**",
              ],
              message: "The model layer must not import an upper layer.",
            },
          ],
        },
      ],
    },
  },
);

