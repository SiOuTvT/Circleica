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
console.log("h-[120px] (封面高120):", cnt(list.t, "h-[120px]"))
console.log("w-[358px] (封面区宽358):", cnt(list.t, "w-[358px]"))
console.log("w-[160px] (封面框宽160):", cnt(list.t, "w-[160px]"))
console.log("left:66px (步长66):", cnt(list.t, "left:66px"))
console.log("px-4 py-4 (上下内边距16):", cnt(list.t, "px-4 py-4"))
console.log("=== 详情页 ===")
console.log("status", det.status)
console.log("text-[16px] (游戏名16px):", cnt(det.t, "text-[16px]"))
console.log("group-hover:text-primary (hover变色):", cnt(det.t, "group-hover:text-primary"))
console.log("transition-colors (名变色过渡):", cnt(det.t, "transition-colors"))
