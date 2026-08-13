/**
 * 对账脚本共用输出工具（只读，无副作用）。
 */
export function h1(s: string): void {
  console.log("\n" + "=".repeat(72))
  console.log(s)
  console.log("=".repeat(72))
}

export function log(...a: unknown[]): void {
  console.log(...a)
}

export function rows(label: string, data: unknown[], limit = 20): void {
  log(`\n[${label}] 命中 ${data.length} 行（展示前 ${Math.min(limit, data.length)}）`)
  for (const r of data.slice(0, limit)) {
    log("  " + JSON.stringify(r))
  }
}
