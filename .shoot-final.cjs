const { chromium } = require('playwright');

const pages = [
  ['curated', 'http://localhost:3000/curated-collections'],
  ['credits', 'http://localhost:3000/credits'],
  ['creators', 'http://localhost:3000/creators'],
  ['tags', 'http://localhost:3000/tags'],
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, url] of pages) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Measure everything in the hero area
    const metrics = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return { error: 'no h1' };
      const h1Rect = h1.getBoundingClientRect();

      // Find the icon: it's the svg inside the flex container that's sibling to h1's ancestor
      let iconSvg = null;
      let iconBox = null;
      // Walk up from h1 to find the flex row container
      let flexRow = h1.closest('div[class*="flex"]');
      while (flexRow && !flexRow.querySelector('svg')) {
        flexRow = flexRow.parentElement?.closest('div[class*="flex"]') || null;
      }
      if (flexRow) {
        iconSvg = flexRow.querySelector('svg');
        iconBox = iconSvg ? iconSvg.getBoundingClientRect() : null;
      }

      // Find the overall header wrapper (ArchiveShell header section)
      let headerWrap = h1.closest('div');
      while (headerWrap && !headerWrap.querySelector('input[type="search"]') && headerWrap !== document.body) {
        headerWrap = headerWrap.parentElement;
      }
      const headerRect = headerWrap && headerWrap !== document.body ? headerWrap.getBoundingClientRect() : null;

      // Search box
      const search = document.querySelector('input[type="search"]');
      const searchRect = search ? search.getBoundingClientRect() : null;

      // The flex row containing icon + text
      const rowRect = flexRow ? flexRow.getBoundingClientRect() : null;

      const cs = (el) => getComputedStyle(el);
      return {
        h1: { text: h1.textContent, w: Math.round(h1Rect.width), h: Math.round(h1Rect.height), top: Math.round(h1Rect.top), left: Math.round(h1Rect.left), fontSize: cs(h1).fontSize, fontFamily: cs(h1).fontFamily },
        iconBox: iconBox ? { w: Math.round(iconBox.width), h: Math.round(iconBox.height), top: Math.round(iconBox.top), left: Math.round(iconBox.left) } : null,
        row: rowRect ? { w: Math.round(rowRect.width), h: Math.round(rowRect.height), top: Math.round(rowRect.top), left: Math.round(rowRect.left) } : null,
        header: headerRect ? { w: Math.round(headerRect.width), h: Math.round(headerRect.height), top: Math.round(headerRect.top), left: Math.round(headerRect.left) } : null,
        search: searchRect ? { w: Math.round(searchRect.width), h: Math.round(searchRect.height), top: Math.round(searchRect.top), left: Math.round(searchRect.left) } : null,
        gap: rowRect && iconBox ? Math.round(h1Rect.left - (iconBox.left + iconBox.width)) : null,
      };
    });

    console.log(`\n=== ${name} ===`);
    console.log(JSON.stringify(metrics, null, 2));

    // Screenshot the full viewport
    await page.screenshot({ path: `D:/Circleica/.shot-final-${name}.png`, fullPage: false });
  }
  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('ERR', e); process.exit(1); });
