import fs from 'fs'
import path from 'path'

const ROOT = 'd:/Circleica'
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', 'build', '.git', 'docs'])
const skipDir = (name) => SKIP_DIRS.has(name) || name.startsWith('.next')
const CODE_EXT = /\.(tsx?|jsx?)$/
const CSS_EXT = /\.css$/
const DRY = process.env.DRY === '1'

const ORDER = ['color', 'background-color', 'border-color', 'text-decoration-color', 'fill', 'stroke',
  'opacity', 'box-shadow', 'transform', 'transform-origin', 'filter', 'backdrop-filter', 'border-radius', 'outline-color']
const SAFE_CSS = 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, transform-origin, filter, backdrop-filter'

let totalReplaced = 0
let totalExceptions = 0
const exceptions = []        // {file, line, reason}
const dirsTouched = new Set()
const fileReport = []        // {file, replaced, kept}

function lineOf(content, idx) {
  let line = 1
  for (let i = 0; i < idx && i < content.length; i++) if (content[i] === '\n') line++
  return line
}

// Strip any Tailwind state variant prefix to get the base utility.
function stripVariant(tok) {
  let t = tok
  let changed = true
  while (changed) {
    changed = false
    if (/^[a-z-]+:/.test(t)) { t = t.replace(/^[a-z-]+:/, ''); changed = true; continue }
    if (/^data-\[[^\]]*\]:/.test(t)) { t = t.replace(/^data-\[[^\]]*\]:/, ''); changed = true; continue }
    if (/^aria-\[[^\]]*\]:/.test(t)) { t = t.replace(/^aria-\[[^\]]*\]:/, ''); changed = true; continue }
    if (/^group-data-\[[^\]]*\]:/.test(t)) { t = t.replace(/^group-data-\[[^\]]*\]:/, ''); changed = true; continue }
    if (/^\[[^\]]*\]:/.test(t)) { t = t.replace(/^\[[^\]]*\]:/, ''); changed = true; continue }
  }
  return t
}

function classify(base, set) {
  if (/^bg-(?!(gradient|cover|center|fixed|local|scroll|repeat|none|clip|origin))/.test(base)) set.add('background-color')
  if (/^text-(?!(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|left|center|right|justify|start|end|pretty|balance|nowrap|wrap|uppercase|lowercase|capitalize|italic|underline|line-through|no-underline|overline|tracking|leading|font))/.test(base)) set.add('color')
  if (/^border-(?!(solid|dashed|dotted|double|none|collapse|[0-9]))/.test(base)) set.add('border-color')
  if (/^ring/.test(base)) set.add('box-shadow')
  if (/^shadow/.test(base)) set.add('box-shadow')
  if (/^-?(scale|translate|rotate|skew|origin)/.test(base)) { set.add('transform'); set.add('transform-origin') }
  if (/^opacity/.test(base)) set.add('opacity')
  if (/^fill/.test(base)) set.add('fill')
  if (/^stroke/.test(base)) set.add('stroke')
  if (/^outline-(?!(none|solid|dashed|dotted|double))/.test(base)) set.add('outline-color')
  if (/^decoration/.test(base)) set.add('text-decoration-color')
  if (/^rounded/.test(base)) set.add('border-radius')
  if (/^(grayscale|invert|sepia|saturate|brightness|contrast|hue-rotate|blur)$/.test(base) || /^blur-/.test(base)) set.add('filter')
  if (/^backdrop/.test(base)) set.add('backdrop-filter')
}

function sortProps(set) {
  const arr = [...set]
  arr.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  return arr
}

// Collect all class tokens from a className value (q = the quote char that opened the value).
function collectTokens(raw, q) {
  const tokens = []
  const push = (s) => { for (const tk of s.split(/\s+/)) { const t = tk.trim(); if (t && t !== 'transition-all') tokens.push(t) } }
  if (q === '"' || q === "'") {
    push(raw)
  } else if (q === '`') {
    // literal text outside ${...}
    push(raw.replace(/\$\{[^}]*\}/g, ' '))
    // quoted strings inside ${...} (e.g. cn args / ternaries)
    const qre = /(["'`])((?:\\.|(?!\1).)*)\1/g
    let mm
    while ((mm = qre.exec(raw)) !== null) push(mm[2])
  } else {
    // brace value (cn(...), ternary, variable): extract quoted strings only
    const qre = /(["'`])((?:\\.|(?!\1).)*)\1/g
    let mm
    while ((mm = qre.exec(raw)) !== null) push(mm[2])
  }
  return tokens
}

function processCodeFile(file, content) {
  const attrRe = /(?:className|class)\s*=/g
  const replacements = []
  let m
  let exceptionsInFile = 0
  let replacedInFile = 0
  while ((m = attrRe.exec(content)) !== null) {
    const prev = m.index > 0 ? content[m.index - 1] : ''
    if (m.index > 0 && /[a-zA-Z0-9_.$]/.test(prev)) continue // part of a larger identifier (e.g. wrapper.class =)
    const eqIdx = m.index + m[0].length
    let i = eqIdx
    while (i < content.length && /\s/.test(content[i])) i++
    const q = content[i]
    let valueStart, valueEnd, raw
    if (q === '"' || q === "'") {
      let j = i + 1; while (j < content.length && content[j] !== q) j++
      valueStart = i + 1; valueEnd = j; raw = content.slice(valueStart, valueEnd)
    } else if (q === '`') {
      let j = i + 1; while (j < content.length && content[j] !== '`') j++
      valueStart = i + 1; valueEnd = j; raw = content.slice(valueStart, valueEnd)
    } else if (q === '{') {
      let depth = 0, j = i
      for (; j < content.length; j++) {
        if (content[j] === '{') depth++
        else if (content[j] === '}') { depth--; if (depth === 0) { j++; break } }
      }
      valueStart = i + 1; valueEnd = j - 1; raw = content.slice(valueStart, valueEnd)
    } else continue

    const tokens = collectTokens(raw, q)
    const propSet = new Set()
    for (const tok of tokens) classify(stripVariant(tok), propSet)

    const taRe = /transition-all/g
    let tm
    while ((tm = taRe.exec(raw)) !== null) {
      const fileStart = valueStart + tm.index
      const fileEnd = valueStart + tm.index + 'transition-all'.length
      if (propSet.size === 0) {
        exceptionsInFile++
        exceptions.push({ file, line: lineOf(content, fileStart), reason: 'no animatable property class detected (likely driven by inline style / external CSS / React state toggle)' })
      } else {
        let rep = 'transition-[' + sortProps(propSet).join(',') + ']'
        // Preserve the implicit defaults that `transition-all` used to provide
        // (Tailwind v4's arbitrary `transition-[...]` may not set them itself).
        const hasDuration = tokens.some(t => /^duration-/.test(t))
        const hasEase = tokens.some(t => /^ease-/.test(t))
        if (!hasDuration) rep += ' duration-150'
        if (!hasEase) rep += ' ease-in-out'
        replacements.push({ start: fileStart, end: fileEnd, text: rep })
        replacedInFile++
      }
    }
  }
  if (replacements.length) {
    replacements.sort((a, b) => b.start - a.start)
    let out = content
    for (const r of replacements) out = out.slice(0, r.start) + r.text + out.slice(r.end)
    if (!DRY) fs.writeFileSync(file, out)
  }
  return { replacedInFile, exceptionsInFile }
}

function processCssFile(file, content) {
  let out = content
  let count = 0
  out = out.replace(/@apply\s+transition-all\b/g, () => { count++; return '@apply transition' })
  out = out.replace(/transition-property:\s*all\b/g, () => { count++; return 'transition-property: ' + SAFE_CSS })
  out = out.replace(/transition:\s*all\b/g, () => { count++; return 'transition: ' + SAFE_CSS })
  if (count && !DRY) fs.writeFileSync(file, out)
  return count
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!skipDir(e.name)) walk(p)
    } else {
      if (CODE_EXT.test(e.name) && !e.name.endsWith('.d.ts')) {
        const content = fs.readFileSync(p, 'utf8')
        if (!content.includes('transition-all')) continue
        const { replacedInFile, exceptionsInFile } = processCodeFile(p, content)
        if (replacedInFile || exceptionsInFile) {
          const rel = path.relative(ROOT, p)
          dirsTouched.add(path.dirname(rel).split(path.sep)[0] + '/' + (path.dirname(rel).split(path.sep)[1] || ''))
          fileReport.push({ file: rel, replaced: replacedInFile, kept: exceptionsInFile })
          totalReplaced += replacedInFile
          totalExceptions += exceptionsInFile
        }
      } else if (CSS_EXT.test(e.name)) {
        const content = fs.readFileSync(p, 'utf8')
        if (!/transition-all|transition:\s*all|transition-property:\s*all/.test(content)) continue
        const count = processCssFile(p, content)
        if (count) {
          const rel = path.relative(ROOT, p)
          dirsTouched.add(path.dirname(rel).split(path.sep)[0] + '/' + (path.dirname(rel).split(path.sep)[1] || ''))
          fileReport.push({ file: rel, replaced: count, kept: 0 })
          totalReplaced += count
        }
      }
    }
  }
}

walk(ROOT)

console.log('\n===== transition-all refactor ' + (DRY ? '(DRY RUN)' : '(APPLIED)') + ' =====')
console.log('Replaced occurrences :', totalReplaced)
console.log('Kept transition-all   :', totalExceptions)
console.log('Directories touched   :', [...dirsTouched].sort().join(', '))
console.log('\n--- Files changed (replaced / kept) ---')
for (const f of fileReport.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`  ${f.file}  (replaced ${f.replaced}, kept ${f.kept})`)
}
if (exceptions.length) {
  console.log('\n--- Kept transition-all (file : line : reason) ---')
  for (const e of exceptions) console.log(`  ${e.file}:${e.line}  ${e.reason}`)
}
