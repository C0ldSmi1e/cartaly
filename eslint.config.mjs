// bun add -d eslint@9.39.5 eslint-config-next@16.3.0 eslint-config-prettier@10.1.8 \
//   eslint-plugin-prettier@5.5.6 prettier@3.9.6 typescript-eslint@8.66.0

import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

const eslintConfig = [
  {
    ignores: ["src/components/ui/**", "src/lib/utils.ts", "src/generated/**"],
  },
  ...nextConfig,
  eslintPluginPrettier,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      indent: "off",
      "linebreak-style": ["error", "unix"],
      quotes: "off",
      semi: "off",
      "no-console": 0,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
