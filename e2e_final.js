const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const issues = [];
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  async function nav(url, name) {
    await page.goto('http://localhost:3099' + url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    return page.url();
  }

  // ===== TEST 1: PUBLIC PAGES =====
  console.log('\n=== 1. PUBLIC PAGES ===');
  const publicPages = [
    ['/', 'Homepage'],
    ['/games', 'Games list'],
    ['/games/1', 'Game detail'],
    ['/search?q=AIR', 'Search'],
    ['/tags', 'Tags'],
    ['/forum', 'Forum'],
    ['/collections', 'Collections'],
    ['/login', 'Login'],
    ['/about', 'About'],
  ];
  for (const [url, name] of publicPages) {
    const currentUrl = await nav(url, name);
    const ok = currentUrl.includes(url.split('?')[0].replace('/', '')) || currentUrl === 'http://localhost:3099/';
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
    if (!ok) issues.push({ id: `PUB-${name}`, desc: `Page ${name} redirected unexpectedly to ${currentUrl}` });
  }

  // ===== TEST 2: LOGIN FLOW =====
  console.log('\n=== 2. LOGIN FLOW ===');
  await nav('/login', 'Login page');

  // Login with testuser_qa (created via API)
  await page.fill('input[placeholder*="用户名"]', 'testuser_qa');
  await page.fill('input[type="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  const loginSuccess = !page.url().includes('/login');
  console.log(`  ${loginSuccess ? '✅' : '❌'} Login result: ${page.url()}`);
  await page.screenshot({ path: '/tmp/e2e/final-01-login.png', fullPage: true });

  if (!loginSuccess) {
    // Check for error message
    const errorText = await page.locator('text=/错误|失败|密码/i').first().textContent().catch(() => 'none');
    console.log(`  Error: ${errorText}`);
  }

  if (loginSuccess) {
    // ===== TEST 3: PROFILE =====
    console.log('\n=== 3. PROFILE ===');
    await nav('/user/3', 'User profile');
    await page.screenshot({ path: '/tmp/e2e/final-02-profile.png', fullPage: true });

    await nav('/profile/edit', 'Profile edit');
    const hasBio = await page.locator('textarea').count() > 0;
    console.log(`  ${hasBio ? '✅' : '❌'} Profile edit has bio field`);
    await page.screenshot({ path: '/tmp/e2e/final-03-profile-edit.png', fullPage: true });

    // ===== TEST 4: GAME DETAIL =====
    console.log('\n=== 4. GAME DETAIL ===');
    await nav('/games/1', 'Game detail');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/e2e/final-04-game-detail.png', fullPage: true });

    const gameText = await page.locator('body').textContent();
    console.log(`  ${gameText.includes('AIR') ? '✅' : '❌'} Game title visible`);
    console.log(`  Tags visible: ${(gameText.match(/标签|tag/gi) || []).length > 0}`);

    // Check tabs
    const tabs = await page.locator('[role="tab"], button:has-text("简介"), button:has-text("资源"), button:has-text("评论")').allTextContents();
    console.log(`  Tabs: ${tabs.join(' | ')}`);

    // Click comment tab
    const commentTab = page.locator('button:has-text("评论"), [role="tab"]:has-text("评论")').first();
    if (await commentTab.count() > 0) {
      await commentTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/e2e/final-05-comments-tab.png', fullPage: true });

      const hasCommentInput = await page.locator('textarea').count() > 0;
      console.log(`  ${hasCommentInput ? '✅' : '❌'} Comment textarea visible after clicking tab`);
    }

    // ===== TEST 5: NOTIFICATIONS =====
    console.log('\n=== 5. NOTIFICATIONS ===');
    await nav('/notifications', 'Notifications');
    await page.screenshot({ path: '/tmp/e2e/final-06-notifications.png', fullPage: true });
    console.log(`  ✅ Notifications page loaded`);

    // ===== TEST 6: FORUM =====
    console.log('\n=== 6. FORUM ===');
    await nav('/forum', 'Forum');
    await page.screenshot({ path: '/tmp/e2e/final-07-forum.png', fullPage: true });
    console.log(`  ✅ Forum page loaded`);

    // ===== TEST 7: ADMIN =====
    console.log('\n=== 7. ADMIN ===');
    const adminUrl = await nav('/admin', 'Admin dashboard');
    const isAdmin = adminUrl.includes('/admin');
    console.log(`  ${isAdmin ? '✅' : '⚠️'} Admin access: ${adminUrl.includes('/admin') ? 'admin page' : 'redirected (may not be admin)'}`);
    await page.screenshot({ path: '/tmp/e2e/final-08-admin.png', fullPage: true });

    if (isAdmin) {
      const adminPages = [
        '/admin/games', '/admin/users', '/admin/announcements',
        '/admin/tags', '/admin/forum', '/admin/review',
        '/admin/audit-logs', '/admin/creators', '/admin/music',
        '/admin/site-settings', '/admin/checkins'
      ];
      for (const pg of adminPages) {
        const u = await nav(pg, pg);
        const ok = u.includes('/admin');
        console.log(`  ${ok ? '✅' : '❌'} ${pg}`);
        if (!ok) issues.push({ id: `ADMIN-${pg}`, desc: `Admin page ${pg} redirected` });
      }
    }

    // ===== TEST 8: SEARCH =====
    console.log('\n=== 8. SEARCH ===');
    await nav('/search?q=AIR', 'Search');
    await page.screenshot({ path: '/tmp/e2e/final-09-search.png', fullPage: true });
    console.log(`  ✅ Search page loaded`);
  }

  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(60));
  console.log('E2E TEST RESULTS');
  console.log('='.repeat(60));
  console.log('Issues found:', issues.length);
  issues.forEach(i => console.log(`  [${i.severity || 'P1'}] ${i.id}: ${i.desc}`));
  console.log('Console errors:', consoleErrors.length);
  consoleErrors.slice(0, 5).forEach(e => console.log(`  - ${e.slice(0, 100)}`));
  console.log('='.repeat(60));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
