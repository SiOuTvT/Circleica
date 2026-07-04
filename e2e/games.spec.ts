import { test, expect } from "./fixtures"

test.describe("游戏列表", () => {
  test("打开 /games，显示游戏列表", async ({ page }) => {
    await page.goto("/games")

    // 页面标题
    await expect(page).toHaveTitle(/游戏/)

    // 游戏卡片或空状态出现
    const cards = page.locator('a[href^="/games/"]')
    const empty = page.getByText("暂无游戏")
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 10_000 })
  })

  test("游戏详情页打开", async ({ page }) => {
    await page.goto("/games")

    // 找到第一个游戏卡片并点击
    const firstCard = page.locator('a[href^="/games/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()

      // 详情页加载
      await page.waitForLoadState("networkidle")

      // 游戏标题存在
      const title = page.locator("h1")
      await expect(title).toBeVisible()

      // 页面不报错
      await expect(page.getByText("出了点问题")).not.toBeVisible()
    }
  })
})

test.describe("游戏详情", () => {
  test("详情页包含核心元素", async ({ page }) => {
    // 直接访问 /games/1（假设存在）
    const res = await page.goto("/games/1")
    if (res?.status() === 404) {
      test.skip()
      return
    }

    await page.waitForLoadState("networkidle")

    // Tab 导航存在
    await expect(page.getByRole("tab", { name: "简介" })).toBeVisible()

    // 浏览量/下载量/收藏量显示
    await expect(page.locator('[class*="tabular-nums"]').first()).toBeVisible()
  })
})
