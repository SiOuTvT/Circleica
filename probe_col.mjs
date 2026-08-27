const C = "http://localhost:3000"
const enc = encodeURIComponent("一个测试合集")
async function get(path) {
  const r = await fetch(C + path, { redirect: "manual" })
  const t = await r.text()
  return { status: r.status, t }
}
const list = await get("/credits/collection")
const det = await get(`/credits/collection/${enc}`)
const cnt = (s, sub) => s.split(sub).length - 1

console.log("=== 列表页 /credits/collection ===")
console.log("status:", list.status)
console.log("页面不存在(404):", cnt(list.t, "页面不存在"))
console.log("部精选 count:", cnt(list.t, "部精选"))
console.log("sm:grid-cols-2(一行2):", cnt(list.t, "sm:grid-cols-2"))
console.log("封面区 w-[304px]:", cnt(list.t, "w-[304px]"))
console.log("h-[95px]:", cnt(list.t, "h-[95px]"))
console.log("叠放 left:58px 出现次数:", cnt(list.t, "left:58px") + cnt(list.t, "left: 58px"))
console.log("hover:-translate-y-0.5:", cnt(list.t, "hover:-translate-y-0.5"))

console.log("=== 详情页 /credits/collection/合集 ===")
console.log("status:", det.status)
console.log("页面不存在(404):", cnt(det.t, "页面不存在"))
console.log("aspect-[4/3](海报墙横版):", cnt(det.t, "aspect-[4/3]"))
console.log("lg:grid-cols-4(一行4):", cnt(det.t, "lg:grid-cols-4"))
console.log("渐变 from-black/75:", cnt(det.t, "from-black/75"))
console.log("/games/ 链接数:", cnt(det.t, "/games/"))
console.log("ImageOff 无图占位:", cnt(det.t, "ImageOff"))
