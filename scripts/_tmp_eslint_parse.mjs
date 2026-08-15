import fs from "fs"
let buf = fs.readFileSync(".eslint_out.json")
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) buf = buf.subarray(3)
const r = JSON.parse(buf.toString("utf8"))
const m = {}
let total = 0
for (const f of r) {
  for (const msg of f.messages) {
    if (msg.severity === 1) {
      m[msg.ruleId] = (m[msg.ruleId] || 0) + 1
      total++
    }
  }
}
const sorted = Object.entries(m).sort((a, b) => b[1] - a[1])
console.log("TOTAL WARNINGS:", total)
for (const [k, v] of sorted) console.log(v, k)
