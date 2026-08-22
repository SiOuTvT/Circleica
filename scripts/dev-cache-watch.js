/**
 * 后台定期清理 .next-dev 缓存
 * 用法：node scripts/dev-cache-watch.js（与 npm run dev 同时运行）
 */
const fs = require("node:fs")
const path = require("node:path")

const nextDir = path.join(process.cwd(), ".next-dev")
const CLEAN_INTERVAL = 5 * 60 * 1000 // 5 分钟
const MAX_SIZE_MB = 300 // 超过 300MB 才清理

function dirSizeMB(dir) {
  let total = 0
  try {
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.isFile()) total += fs.statSync(p).size
      }
    }
    walk(dir)
  } catch {}
  return Math.round(total / 1024 / 1024)
}

function clean() {
  if (!fs.existsSync(nextDir)) return
  const mb = dirSizeMB(nextDir)
  if (mb > MAX_SIZE_MB) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true })
      console.log(`[cache-watch] .next-dev 清理（${mb}MB → 0）`)
    } catch {}
  }
}

console.log(`[cache-watch] 启动，每 ${CLEAN_INTERVAL / 60000} 分钟检查，超过 ${MAX_SIZE_MB}MB 自动清理`)
setInterval(clean, CLEAN_INTERVAL)
