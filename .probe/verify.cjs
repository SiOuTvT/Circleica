const { chromium } = require('playwright');
const pages = [
  { name: 'credits', path: '/credits' },
  { name: 'creators', path: '/creators' },
  { name: 'tags', path: '/tags' },
  { name: 'curated-collections', path: '/curated-collections' },
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 500 } });
  for (const p of pages) {
    await page.goto('http://localhost:3000' + p.path, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1', { timeout: 20000 });
    const data = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const header = h1 ? h1.closest('header') : null;
      let iconEl = null;
      if (header) {
        for (const d of header.querySelectorAll('div')) {
          if (d.className && d.className.includes('h-10') && d.className.includes('items-center')) { iconEl = d; break; }
        }
      }
      const cs = iconEl ? getComputedStyle(iconEl) : null;
      let eyebrowEl = null;
      if (header) {
        for (const el of header.querySelectorAll('p')) {
          if (el.className && el.className.includes('tracking')) { eyebrowEl = el; break; }
        }
      }
      const nav = document.querySelector('nav[aria-label="面包屑导航"]');
      let crumb = '';
      if (nav) {
        for (const s of nav.querySelectorAll('span')) {
          if (s.className && s.className.includes('font-medium')) crumb = s.textContent.trim();
        }
      }
      return {
        iconBorder: cs ? cs.borderTopWidth : 'no-icon',
        iconBg: cs ? cs.backgroundColor : 'n/a',
        iconRadius: cs ? cs.borderTopLeftRadius : 'n/a',
        eyebrow: eyebrowEl ? eyebrowEl.textContent.trim() : 'NONE',
        eyebrowVisible: eyebrowEl ? eyebrowEl.offsetParent !== null : false,
        breadcrumb: crumb || 'NONE',
      };
    });
    console.log(p.name, JSON.stringify(data));
    await page.screenshot({ path: `.probe/v-${p.name}.png` });
  }
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
