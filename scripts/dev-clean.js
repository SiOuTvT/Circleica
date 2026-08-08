/**
 * 开发环境清理脚本：把累积的 .next 构建产物移出项目目录（而非删除），
 * 避免 Windows 沙箱 safe-delete 保护拦截大批量删除，也防止 .next 无限膨胀拖慢 dev。
 * 用法：npm run dev:clean
 */
const fs = require("node:fs")
const path = require("node:path")

// dev 产物目录（与 next.config.ts 的 distDir 保持一致）
const nextDir = path.join(process.cwd(), ".next-dev")

if (!fs.existsSync(nextDir)) {
  console.log("[dev-clean] .next-dev 不存在，无需清理")
  process.exit(0)
}

// 统计大小
function dirSize(dir) {
  let total = 0
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile()) total += fs.statSync(p).size
    }
  }
  walk(dir)
  return total
}

const sizeMB = Math.round(dirSize(nextDir) / 1024 / 1024)
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
// 目标必须在同一盘（跨盘 rename 会 EXDEV），放项目根目录下以 .next-bak- 命名，
// 确认无碍后可自行删除这些备份目录。
const target = path.join(process.cwd(), `.next-bak-${stamp}`)

fs.renameSync(nextDir, target)
console.log(`[dev-clean] .next 已移出（${sizeMB}MB）→ ${target}`)
console.log("[dev-clean] 开始全新构建，首个请求会稍慢（需编译），之后恢复正常")
console.log("[dev-clean] 提示：项目根目录下的 .next-bak-* 为备份产物，确认后可手动删除")
