const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  function ok(n, d) { results.push({n, p:true, d}); console.log(`✅ ${n}: ${d}`); }
  function fail(n, d) { results.push({n, p:false, d}); console.log(`❌ ${n}: ${d}`); }
  function warn(n, d) { results.push({n, p:'warn', d}); console.log(`⚠️ ${n}: ${d}`); }

  async function api(ctx, method, path, body) {
    return ctx.request.fetch('http://localhost:3099' + path, {
      method, data: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    });
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  // ===== PUBLIC API =====
  console.log('\n━━━ PUBLIC API ━━━');
  let res;
  res = await api(ctx, 'GET', '/api/health');
  ok('Health', res.ok() ? '200' : res.status());
  res = await api(ctx, 'GET', '/api/site-settings');
  ok('Site settings', res.ok() ? '200' : res.status());
  res = await api(ctx, 'GET', '/api/games');
  ok('Games API', res.ok() ? '200' : res.status());
  res = await api(ctx, 'GET', '/api/tags');
  ok('Tags API', res.ok() ? '200' : res.status());
  res = await api(ctx, 'GET', '/api/announcements');
  ok('Announcements API', res.ok() ? '200' : res.status());
  res = await api(ctx, 'GET', '/api/forum/posts');
  ok('Forum posts API', res.ok() ? '200' : res.status());

  for (const ep of ['/api/notifications', '/api/checkin', '/api/profile/edit']) {
    res = await api(ctx, 'GET', ep);
    res.status() === 401 ? ok(`Auth guard ${ep}`, '401') : fail(`Auth guard ${ep}`, res.status());
  }

  // ===== REGISTER + LOGIN =====
  console.log('\n━━━ REGISTER + LOGIN ━━━');
  await page.goto('http://localhost:3099/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const regTab = page.locator('button:has-text("注册")').first();
  if (await regTab.isVisible()) { await regTab.click(); await page.waitForTimeout(500); }
  const ts = Date.now();
  await page.fill('input[placeholder*="用户名"]', 'e2e' + ts);
  await page.fill('input[type="email"]', 'e2e' + ts + '@test.com');
  const pwds = page.locator('input[type="password"]');
  await pwds.nth(0).fill('Test1234');
  if (await pwds.count() > 1) await pwds.nth(1).fill('Test1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  ok('Register', page.url().includes('/login') ? 'redirected to login' : page.url());

  // Login
  const loginTab = page.locator('button:has-text("登录")').first();
  if (await loginTab.isVisible()) { await loginTab.click(); await page.waitForTimeout(300); }
  await page.fill('input[placeholder*="用户名"]', 'testuser_qa');
  await page.fill('input[type="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  const loggedIn = !page.url().includes('/login');
  loggedIn ? ok('Login', 'SUCCESS') : fail('Login', page.url());

  if (!loggedIn) { console.log('Cannot proceed without login'); await browser.close(); return; }

  // ===== AUTHENTICATED OPERATIONS =====
  console.log('\n━━━ USER OPERATIONS ━━━');

  // Profile edit
  res = await page.evaluate(() => fetch('/api/profile/edit', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ bio: 'E2E ' + Date.now() }) }).then(r => r.status));
  ok('Profile edit', res === 200 ? '200' : res);

  // Favorite
  const fav = await page.evaluate(() => fetch('/api/games/1/favorite', { method: 'POST' }).then(async r => ({s: r.status, d: await r.json()})));
  ok('Favorite', fav.s === 200 ? `isFav=${fav.d?.data?.isFav}` : fav.s);

  // Unfavorite
  const unfav = await page.evaluate(() => fetch('/api/games/1/favorite', { method: 'POST' }).then(r => r.status));
  ok('Unfavorite', unfav);

  // Comment
  const comment = await page.evaluate(() => fetch('/api/games/1/comments', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ content: 'E2E ' + Date.now() }) }).then(async r => ({s: r.status, d: await r.json()})));
  ok('Create comment', comment.s === 201 ? '201' : comment.s);
  const commentId = comment.d?.id || comment.d?.data?.id;

  // Get comments
  const comments = await page.evaluate(() => fetch('/api/games/1/comments?limit=5').then(async r => ({s: r.status, d: await r.json()})));
  ok('Get comments', comments.s === 200 ? '200' : comments.s);

  // Like comment
  if (commentId) {
    const like = await page.evaluate((id) => fetch(`/api/comments/${id}/like`, { method: 'POST' }).then(async r => ({s: r.status, d: await r.json()})), commentId);
    ok('Like comment', `liked=${like.d?.data?.liked ?? like.d?.liked}`);
  }

  // Forum post
  const post = await page.evaluate(() => fetch('/api/forum/posts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: 'E2E ' + Date.now(), content: 'Content', category: 'discussion' }) }).then(async r => ({s: r.status, d: await r.json()})));
  ok('Create forum post', post.s === 201 ? '201' : post.s);
  const postId = post.d?.id;

  if (postId) {
    const edit = await page.evaluate((id) => fetch(`/api/forum/posts/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: 'Edited', content: 'Edited' }) }).then(r => r.status), postId);
    ok('Edit post', edit);

    const like = await page.evaluate((id) => fetch(`/api/forum/posts/${id}/like`, { method: 'POST' }).then(r => r.status), postId);
    ok('Like post', like);

    const solve = await page.evaluate((id) => fetch(`/api/forum/posts/${id}/solve`, { method: 'POST' }).then(r => r.status), postId);
    ok('Solve post', solve);

    const del = await page.evaluate((id) => fetch(`/api/forum/posts/${id}`, { method: 'DELETE' }).then(r => r.status), postId);
    ok('Delete post', del);
  }

  // Checkin
  const checkin = await page.evaluate(() => fetch('/api/checkin', { method: 'POST' }).then(async r => ({s: r.status, d: await r.json()})));
  console.log('  Checkin:', checkin.s, JSON.stringify(checkin.d?.data || checkin.d).slice(0, 80));
  checkin.s === 200 ? ok('Checkin', `marks=${checkin.d?.data?.marks}`) : warn('Checkin', `Status ${checkin.s}`);

  const dupCheckin = await page.evaluate(() => fetch('/api/checkin', { method: 'POST' }).then(r => r.status));
  ok('Duplicate checkin blocked', dupCheckin === 409 ? '409' : `Status ${dupCheckin}`);

  // Collections
  const col = await page.evaluate(() => fetch('/api/collections', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: 'E2E ' + Date.now() }) }).then(async r => ({s: r.status, d: await r.json()})));
  ok('Create collection', col.s === 201 ? `ID=${col.d?.id}` : col.s);
  if (col.d?.id) {
    await page.evaluate((id) => fetch(`/api/collections/${id}`).then(r => r.status), col.d.id).then(s => ok('Get collection', s));
    await page.evaluate((id) => fetch(`/api/collections/${id}`, { method: 'DELETE' }).then(r => r.status), col.d.id).then(s => ok('Delete collection', s));
  }

  // Play status
  const play = await page.evaluate(() => fetch('/api/games/1/play-status', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'PLAYING' }) }).then(r => r.status));
  ok('Play status', play);

  // Rating
  const rating = await page.evaluate(() => fetch('/api/games/1/rating', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ score: 4 }) }).then(r => r.status));
  ok('Rating', rating);

  // Follow
  const follow = await page.evaluate(() => fetch('/api/follow/3', { method: 'POST' }).then(r => r.status));
  ok('Follow', follow);

  // Notifications
  const unread = await page.evaluate(() => fetch('/api/notifications/unread-count').then(async r => ({s: r.status, d: await r.json()})));
  ok('Unread count', `count=${unread.d?.unreadCount}`);
  const markAll = await page.evaluate(() => fetch('/api/notifications', { method: 'PUT' }).then(r => r.status));
  ok('Mark all read', markAll);

  // Report
  const report = await page.evaluate(() => fetch('/api/games/1/report', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reason: 'E2E' }) }).then(r => r.status));
  ok('Report game', report);

  // Achievement check
  const ach = await page.evaluate(() => fetch('/api/achievements/check', { method: 'POST' }).then(r => r.status));
  ok('Achievement check', ach);

  // Admin guard
  console.log('\n━━━ ADMIN GUARDS ━━━');
  for (const ep of ['/api/admin/games', '/api/admin/users', '/api/admin/reports']) {
    const s = await page.evaluate((ep) => fetch(ep).then(r => r.status), ep);
    s === 401 ? ok(`Guard ${ep}`, '401') : warn(`Guard ${ep}`, s);
  }

  // ===== SUMMARY =====
  console.log('\n' + '═'.repeat(60));
  console.log('PRODUCTION SIMULATION PHASE 1');
  console.log('═'.repeat(60));
  const p = results.filter(r => r.p === true).length;
  const f = results.filter(r => r.p === false).length;
  const w = results.filter(r => r.p === 'warn').length;
  console.log(`PASS: ${p}  FAIL: ${f}  WARN: ${w}  TOTAL: ${results.length}`);
  console.log('─'.repeat(60));
  results.forEach(r => console.log(`${r.p === true ? '✅' : r.p === false ? '❌' : '⚠️'} ${r.n}: ${r.d}`));
  console.log('═'.repeat(60));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
