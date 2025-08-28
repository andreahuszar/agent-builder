import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tailwindcss from "eslint-plugin-tailwindcss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      tailwindcss,
    },
    rules: {
      // Enforces consistent ordering of Tailwind classes
      "tailwindcss/classnames-order": "warn",
      
      // Warns about custom classes not in Tailwind config
      "tailwindcss/no-custom-classname": "warn",
      
      // Enforces negative values format
      "tailwindcss/enforces-negative-arbitrary-values": "warn",
      
      // Enforces using shorthand when possible (p-4 vs px-4 py-4)
      "tailwindcss/enforces-shorthand": "warn",
      
      // Helps migrate from Tailwind v2 to v3
      "tailwindcss/migration-from-tailwind-2": "warn",
      
      // Allow arbitrary values like z-[9999] since we use them
      "tailwindcss/no-arbitrary-value": "off",
      
      // Warn about contradictory classes
      "tailwindcss/no-contradicting-classname": "error",
    },
  },
];

export default eslintConfig;