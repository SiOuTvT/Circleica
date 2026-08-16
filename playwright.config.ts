import { defineConfig, devices } from "@playwright/test"

// 端口可配置：默认 3000，可用 PLAYWRIGHT_PORT 覆盖（例如 3000 被占用时）
const PORT = process.env.PLAYWRIGHT_PORT || "3000"
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `node --max-old-space-size=4096 node_modules/next/dist/bin/next dev --webpack -p ${PORT}`,
    url: BASE_URL,
    // 始终复用已存在的服务器：CI 中 e2e 作业已用 `npm run start &` 起好服务，
    // 若此处为 false 会再起一个 next dev 抢 3000 端口导致冲突。true 时若服务器未就绪
    // 则由 Playwright 自行启动（同样不会冲突）。
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
