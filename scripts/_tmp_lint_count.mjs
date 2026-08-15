import fs from "fs"
const buf = fs.readFileSync("eslint_report.txt")
const txt = buf.includes(Buffer.from([0xff, 0xfe])) ? buf.toString("utf16le") : buf.toString("utf8")
const lines = txt.split("\n").map((x) => x.replace(/\r$/, ""))
const m = {}
let total = 0
for (const l of lines) {
  if (!/warning/.test(l)) continue
  const parts = l.trim().split(/\s+/)
  const rule = parts[parts.length - 1]
  if (rule && /[@a-zA-Z]/.test(rule)) {
    m[rule] = (m[rule] || 0) + 1
    total++
  }
}
const sorted = Object.entries(m).sort((a, b) => b[1] - a[1])
console.log("TOTAL WARNINGS:", total)
for (const [k, v] of sorted) console.log(v, k)
