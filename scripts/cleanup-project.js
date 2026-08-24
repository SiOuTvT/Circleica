/**
 * 项目深度清理脚本
 * 清理：构建产物备份、日志文件、临时文件、eslint输出等
 * 保留：源码、配置、public资源、node_modules、.git
 */
const fs = require("node:fs")
const path = require("node:path")

const cwd = process.cwd()

// 要删除的文件/目录模式
const patternsToDelete = [
  // Next.js 构建备份目录
  ".next-bak",
  ".next-dev-bak",
  ".next_bak",
  ".next_bak_",

  // 日志文件
  ".dev.err",
  ".dev.out",
  ".dev_turbo.log",
  ".build.err",
  ".build.out",
  ".next-build.log",
  ".next-build2.log",
  "dev-server.log",
  "dev-server.err",
  "dev-server.out",
  "dev.log",
  "_dev_err.log",
  "_dev_out.log",
  "_start_restore.log",
  ".npm-install.log",

  // ESLint 输出文件
  ".eslint.txt",
  ".eslint_compact.txt",
  ".eslint_out.json",
  ".lint.out",

  // Jest/测试输出
  ".jest.out",

  // TypeScript 构建信息
  "tsconfig.tsbuildinfo",

  // 临时文件
  "__writetest.tmp",
  ".tsc_check.tmp",
  ".verify_nonce.mjs",
  ".verify_ratelimit.mjs",
  "tmp_screenshot.py",
  "fix_verify.png",

  // Galvelica 临时文件
  ".galvelica-backfill-media.json",
  ".galvelica-ingest.json",

  // playwright 缓存
  ".pw-browsers",

  // npm 临时目录
  ".npmtmp",

  // workbuddy 目录
  ".workbuddy",

  // smoke 测试输出
  "smoke.err",
  "smoke.out",

  // archive 目录（如果是空的或旧的）
  "archive",
]

// 需要递归删除的目录
const dirsToDelete = [
  ".next",
  ".next-dev",
  ".next_bak",
  ".next_bak_b7b",
  ".next_bak_build",
  ".next_bak_build7",
  ".next_bak_prebuild",
]

// 保留的重要文件/目录
const keepPatterns = [
  ".git",
  ".gitignore",
  ".gitattributes",
  ".github",
  "node_modules",
  "public",
  "src",
  "scripts",
  "prisma",
  "docs",
  "e2e",
  "observability",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "next-env.d.ts",
  "eslint.config.mjs",
  "jest.config.ts",
  "jest.setup.ts",
  "playwright.config.ts",
  "postcss.config.mjs",
  "components.json",
  "docker-compose*.yml",
  "Dockerfile",
  "docker-entrypoint.sh",
  "ingest-entrypoint.sh",
  "migrate-entrypoint.sh",
  "deploy.sh",
  "ecosystem.config.js",
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "AGENTS.md",
  "CLAUDE.md",
  ".env",
  ".env.example",
  ".dockerignore",
  "verify.ps1",
]

function getAllFiles(dir, prefix = "") {
  const results = []
  if (!fs.existsSync(dir)) return results

  // 跳过 node_modules 和 .git 避免栈溢出和不必要的遍历
  const skipDirs = new Set(["node_modules", ".git"])
  const baseName = path.basename(dir)
  if (skipDirs.has(baseName)) return results

  const stack = [{ dir, prefix }]

  while (stack.length > 0) {
    const { dir: currentDir, prefix: currentPrefix } = stack.pop()

    try {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        // 跳过 node_modules 和 .git
        if (skipDirs.has(entry.name)) continue

        const fullPath = path.join(currentDir, entry.name)
        const relPath = currentPrefix + entry.name

        if (entry.isDirectory()) {
          results.push({ path: fullPath, relPath, isDir: true })
          stack.push({ dir: fullPath, prefix: relPath + "/" })
        } else {
          results.push({ path: fullPath, relPath, isDir: false })
        }
      }
    } catch (e) {
      // 忽略权限错误等
    }
  }
  return results
}

function shouldDelete(relPath) {
  // 检查是否是要保留的
  for (const keep of keepPatterns) {
    if (relPath === keep || relPath.startsWith(keep + "/")) {
      return false
    }
  }

  // 检查目录模式
  for (const pattern of dirsToDelete) {
    if (relPath === pattern || relPath.startsWith(pattern + "/")) {
      return true
    }
  }

  // 检查文件模式
  for (const pattern of patternsToDelete) {
    if (relPath === pattern || relPath.startsWith(pattern)) {
      // 特殊处理：一些模式是前缀匹配
      if (pattern.endsWith("_") || pattern.endsWith("-")) {
        if (relPath.startsWith(pattern)) return true
      } else if (relPath === pattern || relPath.startsWith(pattern + ".")) {
        return true
      }
    }
  }

  return false
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB"
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB"
}

function deletePath(fullPath, relPath) {
  try {
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true })
      console.log(`🗑️  删除目录: ${relPath}`)
    } else {
      fs.unlinkSync(fullPath)
      console.log(`🗑️  删除文件: ${relPath} (${formatSize(stat.size)})`)
    }
    return stat.size
  } catch (e) {
    console.log(`❌ 删除失败: ${relPath} - ${e.message}`)
    return 0
  }
}

// 执行清理
console.log("🧹 开始清理项目...\n")

const allItems = getAllFiles(cwd)
let totalFreed = 0
let deletedCount = 0

for (const item of allItems) {
  if (shouldDelete(item.relPath)) {
    const size = deletePath(item.path, item.relPath)
    totalFreed += size
    deletedCount++
  }
}

// 处理根目录下的文件（getAllFiles 不包含根目录直接文件）
const rootFiles = fs.readdirSync(cwd, { withFileTypes: true })
for (const entry of rootFiles) {
  if (entry.isFile() && shouldDelete(entry.name)) {
    const fullPath = path.join(cwd, entry.name)
    const size = deletePath(fullPath, entry.name)
    totalFreed += size
    deletedCount++
  }
}

console.log(`\n✅ 清理完成！`)
console.log(`   删除项目: ${deletedCount} 个`)
console.log(`   释放空间: ${formatSize(totalFreed)}`)

// 显示剩余的根目录文件
console.log("\n📁 清理后的根目录:")
const remaining = fs.readdirSync(cwd, { withFileTypes: true })
  .filter(e => !e.name.startsWith(".") || keepPatterns.includes(e.name))
  .sort((a, b) => a.name.localeCompare(b.name))

for (const entry of remaining) {
  const type = entry.isDirectory() ? "📂" : "📄"
  console.log(`   ${type} ${entry.name}`)
}