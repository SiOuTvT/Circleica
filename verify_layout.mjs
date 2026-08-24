import { chromium } from 'playwright'
const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()) })
p.on('pageerror', e => errors.push('PAGEERR ' + e.message))
await p.goto('http://localhost:3000/games/41', { waitUntil: 'load', timeout: 60000 })
await p.waitForTimeout(3000)
await p.evaluate(() => { const btn = [...document.querySelectorAll('button, [role=tab]')].find(b => b.textContent && b.textContent.includes('资源')); if (btn) btn.click() })
await p.waitForTimeout(4000)
await p.screenshot({ path: 'd:/Circleica/fix_verify.png', fullPage: true })

// 找到两栏容器（含 游戏动态 h3 的祖先 flex row），检查其 border-top
const info = await p.evaluate(() => {
  const h3 = [...document.querySelectorAll('h3')].find(e => e.textContent && e.textContent.includes('游戏动态'))
  if (!h3) return { err: 'NO_游戏动态' }
  // 向上找 flex row 容器
  let row = h3
  for (let i = 0; i < 12 && row; i++) {
    const cs = getComputedStyle(row)
    if (cs.display === 'flex' && cs.flexDirection === 'row') {
      const children = [...row.children]
      const left = children.find(c => c.querySelector && c.querySelector('h3') && c.querySelector('h3').textContent.includes('游戏动态'))
      const right = children.find(c => c.querySelector && c.querySelector('h3') && c.querySelector('h3').textContent.includes('下载链接'))
      return {
        containerBorderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle,
        childCount: children.length,
        leftExists: !!left,
        rightExists: !!right,
        rightBorderLeft: right ? (getComputedStyle(right).borderLeftWidth + ' ' + getComputedStyle(right).borderLeftStyle) : 'N/A',
        leftWidth: left ? Math.round(left.getBoundingClientRect().width) : 'N/A',
        rightWidth: right ? Math.round(right.getBoundingClientRect().width) : 'N/A',
        rowFlexWrap: cs.flexWrap,
      }
    }
    row = row.parentElement
  }
  return { err: 'NO_FLEX_ROW' }
})
console.log(JSON.stringify(info, null, 2))
console.log('ERRORS:', errors.length ? JSON.stringify(errors) : 'NONE')
await b.close()
