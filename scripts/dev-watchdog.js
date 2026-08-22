/**
 * 开发环境自动监控：当 .next-dev 膨胀到一定大小时自动重启服务。
 * 用法：node scripts/dev-watchdog.js（与 npm run dev 同时运行）
 */
const fs = require("node:fs")
const path = require("node:path")
const { execSync, spawn } = require("node:child_process")

const NEXT_DIR = path.join(process.cwd(), ".next-dev")
const CHECK_INTERVAL = 60_000  // 每60秒检查一次
const MAX_SIZE_MB = 500        // 超过500MB触发重启
const PORT = 3000

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

function killNode() {
  try {
    execSync("taskkill //F //IM node.exe 2>/dev/null || true", { stdio: "ignore" })
  } catch {}
}

function startDev() {
  // 清理缓存
  try { fs.rmSync(NEXT_DIR, { recursive: true, force: true }) } catch {}
  // 后台启动
  const child = spawn("node", [
    "--max-old-space-size=2048",
    "node_modules/next/dist/bin/next",
    "dev", "--webpack", "-p", String(PORT), "-H", "0.0.0.0"
  ], { cwd: process.cwd(), detached: true, stdio: "ignore" })
  child.unref()
}

function check() {
  if (!fs.existsSync(NEXT_DIR)) return
  const mb = dirSizeMB(NEXT_DIR)
  if (mb > MAX_SIZE_MB) {
    console.log(`[watchdog] .next-dev=${mb}MB > ${MAX_SIZE_MB}MB，重启服务…`)
    killNode()
    startDev()
    console.log(`[watchdog] 已重启，等待编译完成（约10秒）…`)
  }
}

console.log(`[watchdog] 启动，每${CHECK_INTERVAL/1000}秒检查，超${MAX_SIZE_MB}MB自动重启`)
setInterval(check, CHECK_INTERVAL)
check() // 立即检查一次
