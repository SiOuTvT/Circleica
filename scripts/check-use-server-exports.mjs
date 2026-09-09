#!/usr/bin/env node
/**
 * 防呆："use server" 文件只允许导出 async 函数。
 *
 * Next 在加载期就会对含非 async 导出的 "use server" 模块抛
 * `A "use server" file can only export async functions, found object.`，
 * 结果是该模块里所有 action 一调用就 500。这个错误只在运行时才暴露，
 * 所以在 lint 阶段提前拦住。
 *
 * 只依赖 node 内置模块，无第三方依赖。
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..")
const SRC = join(ROOT, "src")
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs"]

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (EXTS.some((ext) => full.endsWith(ext))) out.push(full)
  }
  return out
}

/** 判定为 "use server" 模块：第一个非空行是 "use server" 指令（允许单双引号与分号） */
function isUseServerFile(source) {
  const first = source.split("\n").find((line) => line.trim() !== "")
  if (!first) return false
  return /^\s*(["'])use server\1;?\s*$/.test(first)
}

const files = walk(SRC)
let useServerCount = 0
const violations = []

for (const file of files) {
  const source = readFileSync(file, "utf8")
  if (!isUseServerFile(source)) continue
  useServerCount += 1

  source.split("\n").forEach((line, index) => {
    if (!/^\s*export\s+/.test(line)) return
    // 唯一允许的形态：export async function ...
    if (/^\s*export\s+async\s+function\b/.test(line)) return
    violations.push({ file: relative(ROOT, file), line: index + 1, text: line.trim() })
  })
}

if (violations.length > 0) {
  console.error('[check-use-server-exports] "use server" 文件只允许导出 async 函数，发现违规导出：')
  for (const v of violations) console.error(`  ${v.file}:${v.line}  ${v.text}`)
  console.error(`\n共 ${violations.length} 处。请把常量/类型等挪到不带 "use server" 的模块再 import。`)
  process.exit(1)
}

console.log(
  `[check-use-server-exports] OK：扫描 ${files.length} 个文件，其中 ${useServerCount} 个 "use server" 模块，无违规导出。`,
)
