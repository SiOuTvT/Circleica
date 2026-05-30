import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 脚本文件使用 CommonJS require 语法，不需要 TypeScript 严格检查
    "scripts/**",
  ]),
  {
    rules: {
      // 这个项目中多处使用 useEffect 做数据拉取/localStorage 水合，
      // 这是 React 的标准模式，此规则过于严格，予以关闭
      "react-hooks/set-state-in-effect": "off",
      // 大量 API 响应、第三方库类型不完整，逐步修复中，暂降为警告
      "@typescript-eslint/no-explicit-any": "warn",
      // 动态 import 场景多，保留允许类型注释
      "@typescript-eslint/no-require-imports": ["error", { allow: [] }],
    },
  },
]);

export default eslintConfig;
