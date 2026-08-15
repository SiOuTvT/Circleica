import fs from "fs"
const d = fs.readFileSync(".eslint_out.json", "utf8").replace(/^\uFEFF/, "")
try {
  const r = JSON.parse(d)
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
} catch (e) {
  console.log("parse err", e.message)
}
