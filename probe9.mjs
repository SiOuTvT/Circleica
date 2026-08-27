import fs from "node:fs"
async function check(url) {
  const r = await fetch(url, { redirect: "manual" })
  const t = await r.text()
  const count = (s) => t.split(s).length - 1
  console.log(`URL=${url}`)
  console.log("  status:", r.status, "Bail out:", count("Bail out to client-side rendering"), "页面不存在:", count("页面不存在"), "/games/:", count("/games/"))
}
await check("http://localhost:3000/credits/collection")
await check("http://localhost:3000/")
