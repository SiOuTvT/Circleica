import "dotenv/config"

async function main() {
  const u = "http://127.0.0.1:3000/credits/tag/%E6%B5%81%E6%B5%AA%E8%80%85%E4%B8%BB%E8%A7%92"
  const r = await fetch(u, { redirect: "manual" })
  const h = await r.text()
  const m = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  console.log("status=", r.status)
  console.log("h1=", JSON.stringify(m ? m[1].replace(/<[^>]+>/g, "").trim() : null))
  console.log("has 流浪者主角=", h.includes("流浪者主角"))
  console.log("has 页面不存在=", h.includes("页面不存在"))
  console.log("has 你迷路=", h.includes("你迷路"))
  console.log("has NEXT_HTTP_ERROR_FALLBACK=", h.includes("NEXT_HTTP_ERROR_FALLBACK;404"))
  console.log("has 流浪者主角(name)=", h.includes("流浪者主角"))
  console.log("has 迷路=", h.includes("迷路"))
  console.log("has 返回首页=", h.includes("返回首页"))
  console.log("has 404 illustration=", h.includes(">404<"))
  console.log("len=", h.length)
  const t = h.match(/<title>([\s\S]*?)<\/title>/)
  console.log("title=", JSON.stringify(t ? t[1] : null))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
