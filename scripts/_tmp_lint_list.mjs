import fs from "fs"
const buf = fs.readFileSync(".eslint.txt")
const txt = buf.includes(Buffer.from([0xff, 0xfe])) ? buf.toString("utf16le") : buf.toString("utf8")
const lines = txt.split("\n").map((x) => x.replace(/\r$/, ""))
const re = /^\s*(\d+):(\d+)\s+warning\s+(.*)$/
console.log("===== IMG =====")
for (const l of lines) {
  if (l.includes("no-img-element")) {
    const m = l.match(re)
    if (m) console.log(m[1] + ":" + m[2] + "  " + m[3].replace(/\s*@.*/, ""))
  }
}
console.log("===== UNUSED-VARS =====")
for (const l of lines) {
  if (l.includes("no-unused-vars")) {
    const m = l.match(re)
    if (m) console.log(m[1] + ":" + m[2] + "  " + m[3].replace(/\s*@.*/, ""))
  }
}
console.log("===== EXHAUSTIVE-DEPS =====")
for (const l of lines) {
  if (l.includes("exhaustive-deps")) {
    const m = l.match(re)
    if (m) console.log(m[1] + ":" + m[2] + "  " + m[3].replace(/\s*@.*/, ""))
  }
}
