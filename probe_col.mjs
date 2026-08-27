const C = "http://localhost:3000"
const enc = encodeURIComponent("一个测试合集")
async function get(path) {
  const r = await fetch(C + path, { redirect: "manual" })
  return { status: r.status, t: await r.text() }
}
const list = await get("/credits/collection")
const det = await get(`/credits/collection/${enc}`)
const cnt = (s, sub) => s.split(sub).length - 1
console.log("=== 列表页 ===")
console.log("status", list.status)
console.log("h-[140px] (封面高140):", cnt(list.t, "h-[140px]"))
console.log("px-4 py-4 (padding不变,上下16):", cnt(list.t, "px-4 py-4"))
console.log("text-[17px] (标题17px):", cnt(list.t, "text-[17px]"))
console.log("text-[13px] (副标题13px):", cnt(list.t, "text-[13px]"))
console.log("=== 详情页 ===")
console.log("status", det.status)
console.log("text-[18px] (游戏名18px):", cnt(det.t, "text-[18px]"))
