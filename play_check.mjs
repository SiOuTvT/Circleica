import { chromium } from 'playwright'
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
const errors = []
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
p.on('pageerror', e => errors.push('PAGEERR ' + e.message))
await p.goto('http://localhost:3000/games/41', { waitUntil: 'load', timeout: 60000 })
await p.waitForTimeout(3000)
const clicked = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent && b.textContent.includes('资源'))
  if (btn) { btn.click(); return true }
  return false
})
await p.waitForTimeout(3500)
const info = await p.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter(e => e.textContent && e.textContent.includes('游戏动态'))
  if (!els.length) return 'NO_游戏动态_IN_DOM'
  // 找包含游戏动态的区块，向上找带 flex 的容器
  let el = els[0]
  while (el && !(el.style && (el.style.flexDirection || el.style.display === 'flex'))) el = el.parentElement
  return el ? `FLEX_CONTAINER: display=${el.style.display} flexDirection=${el.style.flexDirection} | html=${el.outerHTML.slice(0, 260)}` : 'NO_FLEX_ANCESTOR_FOUND'
})
console.log('clickedResourceTab:', clicked)
console.log('layoutInfo:', info)
console.log('consoleErrors:', JSON.stringify(errors.slice(0, 12), null, 2))
await b.close()
