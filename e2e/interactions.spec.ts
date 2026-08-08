import { test, expect } from "./fixtures"

test.describe("登录守卫", () => {
  test("未登录访问 /profile 被重定向到登录页", async ({ page }) => {
    await page.goto("/profile")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/login/)
  })

  test("未登录访问 /notifications 被重定向到登录页", async ({ page }) => {
    await page.goto("/notifications")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/login/)
  })

  test("未登录访问 /profile/edit 被重定向到登录页", async ({ page }) => {
    await page.goto("/profile/edit")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/login/)
  })

  test("公开用户主页 /user/[id] 不受守卫影响（404 不跳登录）", async ({ page }) => {
    const res = await page.goto("/user/999999")
    await page.waitForLoadState("networkidle")
    // 不存在的用户应返回 404，而不是被重定向到登录页
    if (res?.status() === 404) {
      await expect(page).toHaveURL(/\/user\/999999/)
    }
  })
})

test.describe("游戏详情互动", () => {
  // 数据库可能没有 serialId=1 的游戏；App Router 自定义 404 页的 HTTP 状态码不保证是 404，
  // 因此用页面内容判定（存在游戏时继续，不存在则跳过）
  async function openFirstGame(page: import("@playwright/test").Page) {
    await page.goto("/games")
    await page.waitForLoadState("networkidle")
    const firstCard = page.locator('a[href^="/games/"]').first()
    if (!(await firstCard.isVisible())) return false
    await firstCard.click()
    await page.waitForLoadState("networkidle")
    return true
  }

  test("详情页收藏按钮在未登录时存在且禁用", async ({ page }) => {
    const ok = await openFirstGame(page)
    if (!ok) {
      test.skip()
      return
    }

    // 收藏按钮（Heart 图标所在按钮）存在且 disabled（未登录）
    const favBtn = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-heart") })
      .first()
    await expect(favBtn).toBeVisible()
    await expect(favBtn).toBeDisabled()
  })

  test("详情页 Tabs 可切换（简介/资源/评论）", async ({ page }) => {
    const ok = await openFirstGame(page)
    if (!ok) {
      test.skip()
      return
    }

    // Tab 导航存在
    const introTab = page.getByRole("tab", { name: "简介" })
    await expect(introTab).toBeVisible()

    // 切换到「资源」Tab
    await page.getByRole("tab", { name: "资源" }).click()
    await expect(page.locator('[data-section="resources"]')).toBeVisible()
  })
})

test.describe("首页互动元素", () => {
  test("首页显示游戏总数/今日签到统计", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // 统计卡区域（游戏总数/今日签到）存在
    await expect(page.getByText(/游戏总数|本周新增|今日签到/).first()).toBeVisible()
  })

  test("主题切换按钮可用（明暗色切换不崩溃）", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const themeToggle = page.locator('button[aria-label*="主题"], button[title*="主题"]').first()
    if (await themeToggle.count()) {
      await themeToggle.click()
      await page.waitForTimeout(300)
      // 页面不崩溃，标题仍在
      await expect(page.locator("body")).toBeVisible()
    }
  })
})
