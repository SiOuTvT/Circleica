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
  ],
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
