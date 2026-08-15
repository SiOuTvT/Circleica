import fs from "fs"
const buf = fs.readFileSync(".eslint.txt")
const txt = buf.includes(Buffer.from([0xff, 0xfe])) ? buf.toString("utf16le") : buf.toString("utf8")
const lines = txt.split("\n").map((x) => x.replace(/\r$/, ""))
let cur = ""
const re = /^\s*(\d+):(\d+)\s+warning\s+(.*)$/
const out = { img: [], unused: [], deps: [] }
for (const l of lines) {
  if (/warning/.test(l)) {
    const m = l.match(re)
    if (m) {
      const msg = m[3].replace(/\s*@.*/, "")
      if (l.includes("no-img-element")) out.img.push(cur + ":" + m[1])
      else if (l.includes("no-unused-vars")) out.unused.push(cur + ":" + m[1] + "  " + msg)
      else if (l.includes("exhaustive-deps")) out.deps.push(cur + ":" + m[1] + "  " + msg)
    }
  } else if (/^[A-Za-z].*\.(tsx?|jsx?|mjs|cjs)$/.test(l.trim()) || /[\\/]/.test(l) && !/warning|error/.test(l)) {
    cur = l.trim()
  }
}
console.log("===== EXHAUSTIVE-DEPS =====")
out.deps.forEach((x) => console.log(x))
console.log("===== UNUSED-VARS =====")
out.unused.forEach((x) => console.log(x))
console.log("===== IMG (count=" + out.img.length + ") =====")
out.img.forEach((x) => console.log(x))
