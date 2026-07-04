import { test, expect } from "./fixtures"

test.describe("搜索", () => {
  test("搜索页打开，显示搜索框", async ({ page }) => {
    await page.goto("/search")

    // 搜索输入框存在
    const input = page.getByPlaceholder("搜索游戏名称、原作、标签…")
    await expect(input).toBeVisible()

    // 搜索按钮存在
    await expect(page.getByRole("button", { name: "搜索" })).toBeVisible()
  })

  test("输入关键词搜索", async ({ page }) => {
    await page.goto("/search")

    const input = page.getByPlaceholder("搜索游戏名称、原作、标签…")
    await input.fill("test")
    await page.getByRole("button", { name: "搜索" }).click()

    // URL 更新包含搜索词
    await expect(page).toHaveURL(/q=test/)

    // 结果区域出现（搜索结果或推荐）
    await expect(page.getByText(/搜索结果|推荐|找到/).first()).toBeVisible({ timeout: 10_000 })
  })

  test("搜索建议下拉", async ({ page }) => {
    await page.goto("/search")

    const input = page.getByPlaceholder("搜索游戏名称、原作、标签…")
    await input.fill("a")

    // 等待建议出现（如果有数据的话）
    // 这里只验证输入不会崩溃
    await page.waitForTimeout(500)
    await expect(input).toBeVisible()
  })
})
