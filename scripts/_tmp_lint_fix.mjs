import fs from "fs"
const buf = fs.readFileSync(".eslint.txt")
const txt = buf.includes(Buffer.from([0xff, 0xfe])) ? buf.toString("utf16le") : buf.toString("utf8")
const lines = txt.split("\n").map((x) => x.replace(/\r$/, ""))
let cur = ""
const re = /^\s*(\d+):(\d+)\s+warning\s+(.*)$/
const warns = []
for (const l of lines) {
  if (/warning/.test(l)) {
    const m = l.match(re)
    if (m && l.includes("no-unused-vars")) {
      const msg = m[3]
      const sym = (msg.match(/'([^']+)' is defined but never used/) || msg.match(/'([^']+)' is assigned a value but never used/))?.[1]
      if (sym) warns.push({ file: cur, line: parseInt(m[1], 10), sym, isParam: /args must match/.test(msg), isLocal: /assigned a value but never used/.test(msg) && !/args must match/.test(msg) })
    }
  } else if (/[\\/]/.test(l) && !/warning|error/.test(l) && /\.(tsx?|mjs)$/.test(l.trim())) {
    cur = l.trim()
  }
}
const DRY = process.argv.includes("--dry")
const changes = []
const files = {}
const get = (f) => (files[f] ||= fs.readFileSync(f, "utf8").split("\n"))
for (const w of warns) {
  const fl = get(w.file)
  const defLine = fl[w.line - 1]
  if (!defLine || !/^\s*import\b/.test(defLine)) continue // only imports
  let nl = defLine
  let removeLine = false
  if (new RegExp(`import\\s+${w.sym}\\s+from`).test(defLine)) {
    removeLine = true // default import, whole line
  } else if (defLine.includes("{") && defLine.includes("}")) {
    const before = nl
    nl = nl.replace(new RegExp(`\\b${w.sym}\\b\\s*,?\\s*`), "")
    nl = nl.replace(/,\s*}/, " }").replace(/{\s*,/, "{ ")
    if (/^import\s*\{\s*\}\s*from/.test(nl.trim())) removeLine = true
    else if (nl === before) continue
  } else continue
  if (removeLine) nl = ""
  fl[w.line - 1] = nl
  changes.push({ file: w.file, line: w.line, sym: w.sym, from: defLine.trim(), to: nl.trim() || "(line removed)" })
}
if (DRY) {
  console.log("DRY RUN — " + changes.length + " import changes:")
  for (const c of changes) console.log(`  ${c.file}:${c.line}  ${c.sym}\n    - ${c.from}\n    + ${c.to}`)
} else {
  for (const f of Object.keys(files)) fs.writeFileSync(f, files[f].join("\n"))
  console.log("APPLIED — " + changes.length + " import changes")
}
