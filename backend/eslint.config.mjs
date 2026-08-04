import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    ignores: [
      "dist/**",
      "node_modules/**",
      "docs/**",
      "coverage/**",
      "eslint.config.mjs",
      "jest.config.ts",
      "jest.int.config.ts"
    ]
  },
  {
    files: ["src/**/*.ts", "__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
      "no-undef": "off" // Handled by TypeScript
    }
  }
);
