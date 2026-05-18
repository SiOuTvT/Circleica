/**
 * 主题配置导出脚本
 *
 * 执行流程：
 *   Step 1: PrismaClient 自动连接 .env 里的 DATABASE_URL
 *   Step 2: 执行 SQL 查询 SiteSetting 表
 *   Step 3: 判断结果 → 有值则解析 JSON，否则降级为默认值
 *   Step 4: 输出 CSS 变量 + TS 常量，可直接粘贴使用
 *
 * 降级路径（三种情况）：
 *   - 表不存在（首次部署）  → catch 分支 → 默认值
 *   - 表存在但 key='theme' 无数据 → rows.length === 0 → 默认值
 *   - 连接超时/DATABASE_URL 未配置 → catch 分支 → 默认值
 *
 * 使用方法：
 *   npx tsx scripts/export-theme.ts
 *   或（配置了 package.json scripts 后）：
 *   npm run theme:export
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface SiteSettings {
  themeColor: string
  themeRadius: number
  themeShadowIntensity: number
  themeAlpha: number
}

const DEFAULTS: SiteSettings = {
  themeColor: "#38BDF8",
  themeRadius: 12,
  themeShadowIntensity: 50,
  themeAlpha: 15,
}

async function main() {
  console.log("🔍 Step 1: 连接数据库...")
  let settings: SiteSettings = { ...DEFAULTS }
  let configSource = "默认值"

  try {
    // Step 2: 执行 SQL 查询
    console.log("🔍 Step 2: 查询 SiteSetting 表 (key='theme')...")
    const rows = (await prisma.$queryRaw`
      SELECT key, value FROM "SiteSetting" WHERE key = 'theme' LIMIT 1
    `) as { key: string; value: string }[]

    // Step 3: 判断结果
    if (rows.length > 0) {
      console.log("✅ Step 3: 数据库中找到主题配置，正在解析 JSON...")
      try {
        settings = { ...DEFAULTS, ...JSON.parse(rows[0].value) }
        configSource = "数据库"
        console.log("   ✅ JSON 解析成功")
      } catch {
        console.log("   ⚠️ JSON 解析失败，使用默认值")
        configSource = "JSON 解析失败 → 降级默认值"
      }
    } else {
      console.log("⚠️ Step 3: 数据库中无 key='theme' 的配置，使用默认值")
      configSource = "数据库无数据 → 降级默认值"
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`⚠️ Step 2/3: 数据库连接失败 — ${msg}`)
    console.log("   降级为默认值")
    configSource = "数据库连接失败 → 降级默认值"
  }

  await prisma.$disconnect()

  // Step 4: 输出结果
  console.log("\n" + "=".repeat(60))
  console.log(`📋 主题配置值（来源：${configSource}）`)
  console.log("=".repeat(60))
  console.log(`  themeColor:          ${settings.themeColor}`)
  console.log(`  themeRadius:         ${settings.themeRadius}`)
  console.log(`  themeShadowIntensity: ${settings.themeShadowIntensity}`)
  console.log(`  themeAlpha:          ${settings.themeAlpha}`)
  console.log("=".repeat(60))

  // CSS 变量格式
  const hex = settings.themeColor
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const radiusPx = `${settings.themeRadius}px`
  const shadowAlpha = (settings.themeShadowIntensity / 100 * 0.15).toFixed(2)
  const bgAlpha = (settings.themeAlpha / 100).toFixed(2)

  console.log("\n📝 可直接粘贴到 src/app/globals.css 的 @theme 块：\n")
  console.log(`    --primary: ${r} ${g} ${b};`)
  console.log(`    --accent: ${r} ${g} ${b};`)
  console.log(`    --ring: ${r} ${g} ${b};`)
  console.log(`    --radius: ${radiusPx};`)
  console.log(`    --glow-spread: ${Math.round(settings.themeShadowIntensity / 100 * 20)}px;`)
  console.log(`    --shadow-alpha: ${shadowAlpha};`)
  console.log(`    --bg-tint-alpha: ${bgAlpha};`)

  // TS 常量格式
  console.log("\n📝 可直接用于 lib/site-settings.ts 的常量：\n")
  console.log(`const FIXED_SETTINGS: SiteSettings = {`)
  console.log(`  themeColor: "${settings.themeColor}",`)
  console.log(`  themeRadius: ${settings.themeRadius},`)
  console.log(`  themeShadowIntensity: ${settings.themeShadowIntensity},`)
  console.log(`  themeAlpha: ${settings.themeAlpha},`)
  console.log(`}`)

  console.log("\n✨ 完成！复制上方输出即可固化主题配置。")
}

main()
