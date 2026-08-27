import fs from "node:fs"
const t = fs.readFileSync("body.html", "utf8")
const count = (s) => t.split(s).length - 1
console.log("/games/ links:", count("/games/"))
console.log('Bail out:', count("Bail out to client-side rendering"))
const has = (zh) => t.includes(zh)
console.log("含『部精选』:", has("部精选"))
console.log("含『页面不存在』:", has("页面不存在"))
console.log("含『该合集暂无游戏』:", has("该合集暂无游戏"))
// 抽取页面里出现的游戏标题(从 /games/serialId 链接附近找 h3 文本)
const titles = [...t.matchAll(/<h3[^>]*>([^<]{1,60})<\/h3>/g)].map((m) => m[1]).slice(0, 6)
console.log("h3 titles:", JSON.stringify(titles))
