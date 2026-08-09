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
    // dev 构建缓存（next-dev 改名残留）。同 .next，是编译产物不是源码，
    // 一旦被 lint 扫到会灌入大量 no-require-imports 噪声，淹没真实问题。
    ".next-dev/**",
    // 根目录临时脚本（保留的诊断/工具脚本，CommonJS require 写法，非应用源码）
    "tmp-tagcolor-cascade.cjs",
    // 调试时把 .next 改名留下的构建产物残留（.next_bak_*/.next_bak2_* 等）。
    // 这些是编译输出不是源码，一旦被 lint 扫到会瞬间灌进上万条噪声错误，
    // 把真实的源码问题淹没。.gitignore 已忽略同名模式，这里同步挡掉。
    ".next_bak*/**",
    ".next_turbobak/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 脚本文件使用 CommonJS require 语法，不需要 TypeScript 严格检查
    "scripts/**",
    // 根目录临时/开发脚本（非应用源码，不纳入 lint 卡点）
    "e2e_test.js",
    "e2e_final.js",
    "prod-sim-phase1.js",
    "start-server.js",
    "start-server2.js",
    "start-server3.js",
    "delete-checkin.ts",
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
      // 允许以 _ 开头的变量名表示有意不使用
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
    },
  },
]);

export default eslintConfig;
