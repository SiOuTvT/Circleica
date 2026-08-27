import fs from "node:fs"
const t = fs.readFileSync("body.html", "utf8")
const msgs = t.match(/"message":"([^"]{5,400})"/g) || []
console.log("=== messages ===")
; [...new Set(msgs)].slice(0, 25).forEach((m) => console.log(m))
const src = t.match(/[A-Za-z]:\\Circleica\\[^"'\\\n]{0,140}/g) || []
console.log("=== src refs ===")
; [...new Set(src)].slice(0, 30).forEach((m) => console.log("SRC>", m))
const digest = t.match(/digest["']?\s*:\s*["'][^"']{0,60}/g) || []
console.log("=== digest ===")
digest.slice(0, 5).forEach((m) => console.log(m))
