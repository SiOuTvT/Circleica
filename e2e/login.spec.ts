import { test, expect } from "./fixtures"

test.describe("登录页", () => {
  test("打开登录页，显示表单", async ({ page }) => {
    await page.goto("/login")

    // 登录 tab 存在
    await expect(page.getByText("登 录").first()).toBeVisible()

    // 用户名输入框存在（通过 placeholder 定位）
    await expect(page.getByPlaceholder("用户名或邮箱")).toBeVisible()

    // 密码输入框存在
    await expect(page.getByPlaceholder("密码")).toBeVisible()

    // 登录按钮存在
    await expect(page.getByRole("button", { name: /登.*录/ }).first()).toBeVisible()
  })

  test("切换到注册 tab", async ({ page }) => {
    await page.goto("/login")

    // 点击注册 tab（文字可能有空格）
    await page.locator('button:has-text("注"), button:has-text("册")').first().click()
    await page.waitForTimeout(500)

    // 注册表单出现（通过 placeholder 定位）
    await expect(page.getByPlaceholder("用户名").first()).toBeVisible()
  })

  test("空表单提交被阻止", async ({ page }) => {
    await page.goto("/login")

    // 点击登录（不填内容）
    await page.getByRole("button", { name: /登.*录/ }).first().click()

    // 浏览器原生验证会阻止提交，页面不会跳转
    await expect(page).toHaveURL(/login/)
  })
})
