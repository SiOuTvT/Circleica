import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^isomorphic-dompurify$": "<rootDir>/src/__mocks__/dompurify.ts",
    // server-only 在 jest（非 Next 服务端打包）下会抛错，置为空操作桩以放行服务端模块测试。
    "^server-only$": "<rootDir>/src/__mocks__/server-only.ts",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/e2e/"],
  transformIgnorePatterns: [
    "node_modules/(?!(@exodus|isomorphic-dompurify|dompurify)/)",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/index.{ts,tsx}",
    // Prisma 生成代码不计入覆盖率：机器生成、非手写业务逻辑，纳入会把全局覆盖率拉到无意义，
    // 且手改会被下次 generate 覆盖。
    "!src/generated/**",
    // 测试文件自身不计入覆盖率
    "!src/__tests__/**",
  ],
  coverageThreshold: {
    // 全局门槛：象征性低档，仅防止覆盖归零（当前全局 lines 6.06%，861 源文件 vs 18 测试文件，
    // 全局门槛设高会让 CI 立即失败、无意义）。真正有约束力的是下面 lib 层的门槛。
    global: {
      lines: 5,
      branches: 3,
      functions: 2,
      statements: 5,
    },
    // 核心 lib 层门槛：安全/解析/限流/CSRF/sanitize 等纯函数集中于此，
    // 实测 lines 24.1 / branches 25.6 / functions 29.8 / statements 22.0，门槛取约 75% 留缓冲，
    // 守住这块核心逻辑不再退化（后续补测逐步抬升，即审计 3.4「低门槛起步再抬升」）。
    "./src/lib/**/*.ts": {
      lines: 18,
      branches: 15,
      functions: 18,
      statements: 18,
    },
  },
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: false },
          transform: { react: { runtime: "automatic" } },
        },
      },
    ],
  },
}

export default config
