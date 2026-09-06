import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"

const prisma = new PrismaClient()
const BASE = "http://127.0.0.1:3000"

const extractH1 = (html) => {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null
}
const countCards = (html) => (html.match(/href="\/games\//g) || []).length
const isNotFound = (html) => html.includes("页面不存在")

const get = async (path) => {
  const res = await fetch(BASE + path, { redirect: "manual" })
  const html = await res.text()
  return { res, html }
}

console.log("=== 6 个指定地址实测 ===")
const tests = [
  ["男主角", "/credits/tag/%E7%94%B7%E4%B8%BB%E8%A7%92"],
  ["剧情", "/credits/tag/%E5%89%A7%E6%83%85"],
  ["悬疑", "/credits/tag/%E6%82%AC%E7%96%91"],
  ["傲娇女主", "/credits/tag/%E5%82%B2%E5%A8%87%E5%A5%B3%E4%B8%BB"],
  ["adv", "/credits/tag/adv"],
  ["nvl", "/credits/tag/nvl"],
]
for (const [expected, path] of tests) {
  const { res, html } = await get(path)
  console.log(
    `${path}\n  status=${res.status} h1=${JSON.stringify(extractH1(html))} cards=${countCards(html)} notFound=${isNotFound(html)} expectedName=${expected}`,
  )
}

console.log("\n=== 副站 galvelica 标签（应仍 404 / 页面不存在）===")
const g = await prisma.tag.findFirst({
  where: { source: "galvelica" },
  select: { slug: true, name: true, source: true },
})
if (!g) {
  console.log("  未找到任何 source=galvelica 的标签，跳过该项")
} else {
  const slug = g.slug
  const path = "/credits/tag/" + encodeURIComponent(slug)
  const { res, html } = await get(path)
  console.log(
    `  galvelica slug=${JSON.stringify(slug)} name=${JSON.stringify(g.name)}\n  path=${path}\n  status=${res.status} notFound=${isNotFound(html)}`,
  )
}

console.log("\n=== 主站 circleica 标签全量复核 ===")
const tags = await prisma.tag.findMany({
  where: { source: "circleica" },
  select: { slug: true, name: true },
  orderBy: { name: "asc" },
})
let ok = 0
const fail = []
for (const t of tags) {
  const path = "/credits/tag/" + encodeURIComponent(t.slug)
  try {
    const { res, html } = await get(path)
    const bad = isNotFound(html)
    const hasName = html.includes(t.name)
    if (bad || !hasName) {
      fail.push({ slug: t.slug, name: t.name, status: res.status, notFound: bad, hasName })
    } else {
      ok++
    }
  } catch (e) {
    fail.push({ slug: t.slug, name: t.name, error: String(e) })
  }
}
console.log(`circleica 标签总数=${tags.length} 正常打开=${ok} 异常=${fail.length}`)
if (fail.length) {
  for (const f of fail) console.log("  FAIL " + JSON.stringify(f))
}

await prisma.$disconnect()
