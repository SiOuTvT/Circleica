import { test, expect } from "./fixtures"

test.describe("首页", () => {
  test("打开首页，显示标题和游戏列表", async ({ page }) => {
    await page.goto("/")

    // 页面标题包含站点名
    await expect(page).toHaveTitle(/Circleica/)

    // H1 存在（sr-only SEO 标题）
    const h1 = page.locator("h1")
    await expect(h1).toContainText("Circleica")

    // 最新资源区域存在
    await expect(page.getByText("最新资源").first()).toBeVisible()

    // 至少有一个游戏卡片（如果数据库有数据）
    const cards = page.locator('a[href^="/games/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test("侧边栏导航存在", async ({ page }) => {
    await page.goto("/")

    // 左侧导航栏存在（aside 元素）
    const sidebar = page.locator("aside nav")
    await expect(sidebar).toBeVisible({ timeout: 10_000 })

    // 搜索按钮存在于顶部导航
    const searchLink = page.locator('a[href="/search"]')
    await expect(searchLink.first()).toBeVisible()
  })

  test("公告轮播存在（如有数据）", async ({ page }) => {
    await page.goto("/")

    // 公告区域或品牌卡存在
    const hero = page.locator('[class*="rounded-2xl"]').first()
    await expect(hero).toBeVisible()
  })
})
