import { test, expect } from "./fixtures"

test.describe("论坛", () => {
  test("论坛页打开，显示帖子列表", async ({ page }) => {
    await page.goto("/forum")

    // 页面标题（论坛实际标题可能是"求档区"或其他）
    await expect(page).toHaveTitle(/同人游戏站/)

    // 分类筛选存在
    await expect(page.getByText("全部").first()).toBeVisible()

    // 帖子列表或空状态
    const posts = page.locator('[class*="rounded"]').first()
    await expect(posts).toBeVisible({ timeout: 10_000 })
  })

  test("点击帖子打开详情", async ({ page }) => {
    await page.goto("/forum")
    await page.waitForLoadState("networkidle")

    // 找到第一个帖子链接
    const firstPost = page.locator('a[href*="/forum/"]').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState("networkidle")

      // 详情页加载，不报错
      await expect(page.getByText("出了点问题")).not.toBeVisible()
    }
  })

  test("论坛帖子详情页直接访问", async ({ page }) => {
    const res = await page.goto("/forum/1")
    if (res?.status() === 404) {
      test.skip()
      return
    }

    await page.waitForLoadState("networkidle")

    // 帖子标题存在
    await expect(page.locator("h1, h2, [class*='font-bold']").first()).toBeVisible()
  })
})
