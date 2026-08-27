import fs from "node:fs"
const t = fs.readFileSync("body.html", "utf8")
// 抽取所有长度>=15的引号字符串
const strs = t.match(/"([^"\\]{15,300})"/g) || []
const uniq = [...new Set(strs.map((s) => s.slice(1, -1)))]
// 过滤掉明显是 HTML/属性/URL 的，保留像句子/错误的
const interesting = uniq.filter((s) =>
  /\s/.test(s) && !s.startsWith("<") && !s.startsWith("http") && !s.startsWith("/") && !s.includes("px") && !s.includes("rgba") && !/^[a-z-]+:/.test(s),
)
console.log("=== interesting strings (" + interesting.length + ") ===")
interesting.slice(0, 40).forEach((s) => console.log("· " + s.slice(0, 200)))
