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
    ignores: [
      // Dependencies
      "node_modules/**",
      
      // Build outputs
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      ".vercel/**",
      ".netlify/**",
      
      // Generated files
      "next-env.d.ts",
      "**/*.d.ts",
      ".next/types/**",
      ".next/static/**",
      
      // Cache directories
      ".cache/**",
      ".temp/**",
      ".tmp/**",
      
      // Logs
      "*.log",
      "logs/**",
      
      // Environment files
      ".env",
      ".env.local",
      ".env.development.local",
      ".env.test.local",
      ".env.production.local",
      
      // IDE files
      ".vscode/**",
      ".idea/**",
      "*.swp",
      "*.swo",
      
      // OS files
      ".DS_Store",
      "Thumbs.db",
      
      // Package manager files
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      
      // Coverage reports
      "coverage/**",
      ".nyc_output/**",
      
      // Storybook
      "storybook-static/**",
      
      // Firebase
      ".firebase/**",
      "firebase-debug.log",
      "firestore-debug.log",
      
      // Other common build artifacts
      "*.tsbuildinfo",
      ".turbo/**",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "react/jsx-no-undef": "error",
    },
  },
];

export default eslintConfig;
