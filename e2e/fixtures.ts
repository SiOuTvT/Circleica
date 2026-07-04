import { test as base, expect } from "@playwright/test"

/** 扩展 test fixture，提供常用工具 */
export const test = base.extend<{ waitReady: void }>({
  waitReady: [async ({ page }, use) => {
    // 等待页面 hydration 完成（Next.js 水合后 body 会有特定属性）
    await page.waitForLoadState("networkidle")
    await use()
  }, { auto: true }],
})

export { expect }
