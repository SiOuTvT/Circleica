/**
 * 临时诊断：验证 VNDB 复合过滤 [or ng / in / co-allowlist] 语法是否可用，
 * 并查准一批「同人出身公司」的 producer ID 用于白名单种子。
 */
const BASE = "https://api.vndb.org/kana"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function post(endpoint: string, body: Record<string, unknown>) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Circleica-Diag/1.0" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text().catch(() => "")}`)
  return r.json() as Promise<any>
}

async function main() {
  // 1) 验证复合 OR 过滤语法
  const coIds = ["p6", "p4", "p42", "p27", "p240", "p336", "p143", "p1040", "p65", "p13"]
  const orFilter = [
    "or",
    ["developer", "=", ["type", "=", "ng"]],
    ["developer", "=", ["type", "=", "in"]],
    ...coIds.map((id) => ["developer", "=", ["id", "=", id]] as unknown[]),
  ]
  try {
    const r = await post("vn", {
      filters: orFilter,
      results: 3,
      fields: "id,title,developers.id,developers.name,developers.type",
      sort: "rating",
      reverse: true,
    })
    console.log("✅ OR 复合过滤可用，返回 results:", r.results?.length, "more:", r.more)
    for (const v of r.results ?? []) {
      console.log(
        "  -",
        v.title,
        "| devs:",
        (v.developers ?? []).map((d: any) => `${d.name}(${d.type}:${d.id})`).join(","),
      )
    }
  } catch (e) {
    console.log("❌ OR 复合过滤失败:", (e as Error).message)
  }

  await sleep(1200)
  // 2) 查准「同人出身公司」producer ID（用于白名单种子）
  const brands = [
    "TYPE-MOON", "âge", "Nitroplus", "Circus", "Navel", "minori",
    "OVERDRIVE", "Frontwing", "130cm", "Tail", "KeroQ", "âge",
  ]
  for (const b of brands) {
    try {
      const r = await post("producer", {
        filters: ["search", "=", b],
        results: 4,
        fields: "id,name,type",
      })
      const hits = (r.results ?? []).map((p: any) => `${p.name}(${p.type}:${p.id})`).join(" / ")
      console.log(`brand "${b}": ${hits}`)
    } catch (e) {
      console.log(`brand "${b}": ERR ${(e as Error).message}`)
    }
    await sleep(1000)
  }
}

main().catch((e) => {
  console.error("异常", e)
  process.exit(1)
})
