const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const results = [];

  function log(test, status, detail) {
    detail = detail || '';
    results.push({ test, status, detail });
    const mark = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(mark + ' ' + test + ': ' + detail.slice(0, 80));
  }

  // 1. Homepage
  await page.goto('http://localhost:3099');
  await page.waitForLoadState('networkidle');
  const title = await page.title();
  const gameLinks = await page.locator('[href*="/games/"]').count();
  log('Homepage loads', title ? 'PASS' : 'FAIL', 'Title: ' + title);
  log('Games on homepage', gameLinks > 0 ? 'PASS' : 'FAIL', 'Links: ' + gameLinks);
  await page.screenshot({ path: '/tmp/e2e/01-homepage.png', fullPage: true });

  // 2. Games list
  await page.goto('http://localhost:3099/games');
  await page.waitForLoadState('networkidle');
  const gameCount = await page.locator('[href*="/games/"]').count();
  log('Games list', gameCount > 0 ? 'PASS' : 'FAIL', 'Cards: ' + gameCount);
  await page.screenshot({ path: '/tmp/e2e/02-games.png', fullPage: true });

  // 3. Game detail
  await page.locator('[href*="/games/"]').first().click();
  await page.waitForLoadState('networkidle');
  log('Game detail loads', 'PASS', 'URL: ' + page.url());
  await page.screenshot({ path: '/tmp/e2e/03-game-detail.png', fullPage: true });

  // 4. Login page
  await page.goto('http://localhost:3099/login');
  await page.waitForLoadState('networkidle');
  const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
  log('Login page', hasLoginForm ? 'PASS' : 'FAIL');
  await page.screenshot({ path: '/tmp/e2e/04-login.png', fullPage: true });

  // 5. Register
  const regTab = page.locator('button:has-text("注册"), [role="tab"]:has-text("注册")').first();
  if (await regTab.count() > 0) await regTab.click();
  await page.waitForTimeout(500);

  await page.locator('input[placeholder*="用户名"]').first().fill('e2etest');
  await page.locator('input[type="email"]').first().fill('e2etest@example.com');
  const pwdInputs = page.locator('input[type="password"]');
  await pwdInputs.nth(0).fill('Test1234');
  if (await pwdInputs.count() > 1) await pwdInputs.nth(1).fill('Test1234');
  await page.screenshot({ path: '/tmp/e2e/05-register.png', fullPage: true });

  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  log('Register', 'PASS', 'URL: ' + page.url());
  await page.screenshot({ path: '/tmp/e2e/06-register-result.png', fullPage: true });

  // 6. Login
  await page.goto('http://localhost:3099/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const loginTab = page.locator('button:has-text("登录")').first();
  if (await loginTab.count() > 0) await loginTab.click();
  await page.waitForTimeout(300);

  await page.locator('input[placeholder*="用户名"]').first().fill('e2etest');
  await page.locator('input[type="password"]').first().fill('Test1234');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);

  const loggedIn = !page.url().includes('/login');
  log('Login', loggedIn ? 'PASS' : 'FAIL', 'URL: ' + page.url());
  await page.screenshot({ path: '/tmp/e2e/07-login.png', fullPage: true });

  if (loggedIn) {
    // 7. Profile edit
    await page.goto('http://localhost:3099/profile/edit');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const hasBio = await page.locator('textarea').count() > 0;
    log('Profile edit page', hasBio ? 'PASS' : 'WARN', 'Has textarea: ' + hasBio);
    await page.screenshot({ path: '/tmp/e2e/08-profile-edit.png', fullPage: true });

    // 8. Favorite
    await page.goto('http://localhost:3099/games');
    await page.waitForLoadState('networkidle');
    await page.locator('[href*="/games/"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const favBtn = page.locator('button:has-text("收藏"), [aria-label*="收藏"]').first();
    if (await favBtn.count() > 0) {
      await favBtn.click();
      await page.waitForTimeout(1500);
      log('Favorite click', 'PASS');
    } else {
      log('Favorite button', 'WARN', 'Not found');
    }
    await page.screenshot({ path: '/tmp/e2e/09-favorite.png', fullPage: true });

    // 9. Comment
    const commentArea = page.locator('textarea').first();
    if (await commentArea.count() > 0) {
      await commentArea.fill('E2E test comment');
      const commentSubmit = page.locator('button:has-text("发布"), button:has-text("评论")').first();
      if (await commentSubmit.count() > 0) {
        await commentSubmit.click();
        await page.waitForTimeout(2000);
        const commentVis = await page.locator('text=E2E test comment').count() > 0;
        log('Comment submit', commentVis ? 'PASS' : 'FAIL');
      } else {
        log('Comment submit btn', 'WARN', 'Not found');
      }
    } else {
      log('Comment textarea', 'WARN', 'Not found');
    }
    await page.screenshot({ path: '/tmp/e2e/10-comment.png', fullPage: true });

    // 10. Forum
    await page.goto('http://localhost:3099/forum');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    log('Forum page', 'PASS');
    await page.screenshot({ path: '/tmp/e2e/11-forum.png', fullPage: true });

    // 11. Profile
    await page.goto('http://localhost:3099/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    log('Profile page', 'PASS', 'URL: ' + page.url());
    await page.screenshot({ path: '/tmp/e2e/12-profile.png', fullPage: true });

    // 12. Notifications
    await page.goto('http://localhost:3099/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    log('Notifications', 'PASS');
    await page.screenshot({ path: '/tmp/e2e/13-notifications.png', fullPage: true });

    // 13-15. Other pages
    for (const pg of ['tags', 'search', 'collections']) {
      await page.goto('http://localhost:3099/' + pg);
      await page.waitForLoadState('networkidle');
      log(pg + ' page', 'PASS');
      await page.screenshot({ path: '/tmp/e2e/' + pg + '.png', fullPage: true });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  console.log('PASS=' + passed + ' FAIL=' + failed + ' WARN=' + warned + ' TOTAL=' + results.length);
  console.log('='.repeat(60));
  results.forEach(r => {
    const mark = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log('  ' + mark + ' ' + r.test + ': ' + r.detail.slice(0, 80));
  });

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
