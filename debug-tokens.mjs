const s = 'flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted'
const re = /(["'`])((?:\\.|(?!\1).)*)\1/g
let m, toks = []
while ((m = re.exec(s)) !== null) {
  for (const t of m[2].split(/\s+/)) { const x = t.trim(); if (x && x !== 'transition-all') toks.push(x) }
}
console.log('TOKENS:', toks)
function stripVariant(tok) {
  let t = tok, ch = true
  while (ch) {
    ch = false
    if (/^[a-z-]+:/.test(t)) { t = t.replace(/^[a-z-]+:/, ''); ch = true; continue }
    if (/^data-\[[^\]]*\]:/.test(t)) { t = t.replace(/^data-\[[^\]]*\]:/, ''); ch = true; continue }
    if (/^aria-\[[^\]]*\]:/.test(t)) { t = t.replace(/^aria-\[[^\]]*\]:/, ''); ch = true; continue }
    if (/^group-data-\[[^\]]*\]:/.test(t)) { t = t.replace(/^group-data-\[[^\]]*\]:/, ''); ch = true; continue }
    if (/^\[[^\]]*\]:/.test(t)) { t = t.replace(/^\[[^\]]*\]:/, ''); ch = true; continue }
  }
  return t
}
function cl(base, set) {
  if (/^bg-(?!(gradient|cover|center|fixed|local|scroll|repeat|none|clip|origin))/.test(base)) set.add('background-color')
  if (/^ring/.test(base)) set.add('box-shadow')
  if (/^text-(?!(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|left|center|right|justify|start|end|pretty|balance|nowrap|wrap|uppercase|lowercase|capitalize|italic|underline|line-through|no-underline|overline|tracking|leading|font))/.test(base)) set.add('color')
}
const set = new Set()
for (const tk of toks) cl(stripVariant(tk), set)
console.log('SET:', [...set])
