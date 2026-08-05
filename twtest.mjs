import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import fs from 'fs'

fs.writeFileSync('tw-content.txt', '<div class="flex flex-col flex-row flex-row-reverse flex-col-reverse"></div>')
const css = `@import "tailwindcss";\n@source "./tw-content.txt";\n`

const result = await postcss([tailwind()]).process(css, { from: 'tw-input.css' })
fs.writeFileSync('tw-out.css', result.css)
const lines = result.css.split('\n')
lines.forEach((l, i) => {
  if (/flex-(row|col)(-reverse)?\s*\{/.test(l)) {
    console.log((i+1) + ': ' + l.trim())
  }
})
