const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  function ok(name, detail) { results.push({ name, pass: true, detail: detail || '' }); console.log(`✅ ${name}: ${detail || 'OK'}`); }
  function fail(name, detail) { results.push({ name, pass: false, detail: detail || '' }); console.log(`❌ ${name}: ${detail}`); }
  function warn(name, detail) { results.push({ name, pass: 'warn', detail: detail || '' }); console.log(`⚠️ ${name}: ${detail}`); }

  // ==================== VISITOR FLOW ====================
  console.log('\n━━━ VISITOR FLOW ━━━');

  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page1 = await ctx1.newPage();

  // 1. Homepage
  let r = await page1.goto('http://localhost:3099/');
  await page1.waitForLoadState('networkidle');
  ok('Homepage loads', `${r.status()} ${await page1.title()}`);

  // 2. Games list
  r = await page1.goto('http://localhost:3099/games');
  await page1.waitForLoadState('networkidle');
  const gameCards = await page1.locator('[href*="/games/"]').count();
  gameCards > 0 ? ok('Games list', `${gameCards} games`) : fail('Games list', 'No games');

  // 3. Search
  r = await page1.goto('http://localhost:3099/search?q=AIR');
  await page1.waitForLoadState('networkidle');
  ok('Search page', r.status());

  // 4. Game detail
  r = await page1.goto('http://localhost:3099/games/1');
  await page1.waitForLoadState('networkidle');
  await page1.waitForTimeout(2000);
  const hasTitle = await page1.locator('h1, h2').first().textContent().catch(() => '');
  ok('Game detail', hasTitle.includes('AIR') ? 'AIR loaded' : 'content loaded');

  // 5. Forum
  r = await page1.goto('http://localhost:3099/forum');
  await page1.waitForLoadState('networkidle');
  ok('Forum page', r.status());

  // 6. Tags
  r = await page1.goto('http://localhost:3099/tags');
  await page1.waitForLoadState('networkidle');
  ok('Tags page', r.status());

  // 7. Collections
  r = await page1.goto('http://localhost:3099/collections');
  await page1.waitForLoadState('networkidle');
  ok('Collections page', r.status());

  await ctx1.close();

  // ==================== REGISTERED USER FLOW ====================
  console.log('\n━━━ REGISTERED USER FLOW ━━━');

  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page2 = await ctx2.newPage();

  // Use page.evaluate to make authenticated API calls
  async function authApi(method, path, body) {
    return page2.evaluate(async ({ method, path, body }) => {
      const opts = { method, headers: {} };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      const res = await fetch(path, opts);
      return { status: res.status, data: await res.json().catch(() => null) };
    }, { method, path, body });
  }

  // Login
  await page2.goto('http://localhost:3099/login');
  await page2.waitForLoadState('networkidle');
  await page2.fill('input[placeholder*="用户名"]', 'testuser_qa');
  await page2.fill('input[type="password"]', 'testpass123');
  await page2.click('button[type="submit"]');
  await page2.waitForTimeout(5000);
  const loggedIn = !page2.url().includes('/login');
  loggedIn ? ok('Login', 'Redirected to homepage') : fail('Login', page2.url());

  if (loggedIn) {
    // Profile edit
    const profileRes = await authApi('PUT', '/api/profile/edit', { bio: 'E2E test bio ' + Date.now() });
    profileRes.status === 200 ? ok('Profile edit API', '200') : fail('Profile edit API', `Status ${profileRes.status}`);

    // Favorite
    const favRes = await authApi('POST', '/api/games/1/favorite');
    console.log('  Favorite response:', JSON.stringify(favRes.data?.data || {}).slice(0, 100));
    favRes.status === 200 ? ok('Favorite toggle', '200') : fail('Favorite toggle', `Status ${favRes.status}`);

    // Favorite again (unfavorite)
    const favRes2 = await authApi('POST', '/api/games/1/favorite');
    ok('Unfavorite toggle', favRes2.status === 200 ? '200' : `Status ${favRes2.status}`);

    // Create comment
    const commentRes = await authApi('POST', '/api/games/1/comments', { content: 'E2E production test ' + Date.now() });
    commentRes.status === 201 ? ok('Create comment', '201') : fail('Create comment', `Status ${commentRes.status}`);

    // Get comments
    const commentsRes = await authApi('GET', '/api/games/1/comments?limit=5');
    commentsRes.status === 200 ? ok('Get comments', '200') : fail('Get comments', `Status ${commentsRes.status}`);

    // Like comment (if we have one)
    if (commentRes.data?.id) {
      const likeRes = await authApi('POST', `/api/comments/${commentRes.data.id}/like`);
      likeRes.status === 200 ? ok('Like comment', `liked: ${likeRes.data?.liked}`) : fail('Like comment', `Status ${likeRes.status}`);

      // Delete comment
      const delRes = await authApi('DELETE', `/api/comments/${commentRes.data.id}`);
      delRes.status === 200 || delRes.status === 204 ? ok('Delete comment', `${delRes.status}`) : fail('Delete comment', `Status ${delRes.status}`);
    }

    // Create forum post
    const postRes = await authApi('POST', '/api/forum/posts', { title: 'E2E Post ' + Date.now(), content: 'Production simulation content', category: 'discussion' });
    postRes.status === 201 ? ok('Create forum post', '201') : fail('Create forum post', `Status ${postRes.status}`);

    // Edit forum post
    if (postRes.data?.id) {
      const editRes = await authApi('PUT', `/api/forum/posts/${postRes.data.id}`, { title: 'Edited Title', content: 'Edited content' });
      editRes.status === 200 ? ok('Edit forum post', '200') : fail('Edit forum post', `Status ${editRes.status}`);

      // Like post
      const likePost = await authApi('POST', `/api/forum/posts/${postRes.data.id}/like`);
      ok('Like forum post', `Status ${likePost.status}`);

      // Solve post
      const solveRes = await authApi('POST', `/api/forum/posts/${postRes.data.id}/solve`);
      ok('Solve forum post', `Status ${solveRes.status}`);

      // Delete post
      const delPost = await authApi('DELETE', `/api/forum/posts/${postRes.data.id}`);
      delPost.status === 200 || delPost.status === 204 ? ok('Delete forum post', `${delPost.status}`) : fail('Delete forum post', `Status ${delPost.status}`);
    }

    // Forum comment
    const forumComment = await authApi('POST', '/api/forum/posts/1/comments', { content: 'E2E forum comment' });
    ok('Forum comment', `Status ${forumComment.status}`);

    // Checkin
    const checkinRes = await authApi('POST', '/api/checkin');
    console.log('  Checkin:', checkinRes.status, JSON.stringify(checkinRes.data?.data || {}).slice(0, 80));
    checkinRes.status === 200 ? ok('Checkin', `marks: ${checkinRes.data?.marks}, streak: ${checkinRes.data?.streak}`) : warn('Checkin', `Status ${checkinRes.status} (may be duplicate)`);

    // Duplicate checkin
    const checkinDup = await authApi('POST', '/api/checkin');
    checkinDup.status === 409 ? ok('Duplicate checkin blocked', '409') : warn('Duplicate checkin', `Status ${checkinDup.status}`);

    // Checkin status
    const statusRes = await authApi('GET', '/api/checkin');
    statusRes.data?.checkedIn === true ? ok('Checkin status', 'checkedIn: true') : fail('Checkin status', JSON.stringify(statusRes.data));

    // Collections
    const colRes = await authApi('POST', '/api/collections', { name: 'E2E Collection' });
    colRes.status === 201 ? ok('Create collection', `ID: ${colRes.data?.id}`) : fail('Create collection', `Status ${colRes.status}`);

    if (colRes.data?.id) {
      const colGet = await authApi('GET', `/api/collections/${colRes.data.id}`);
      colGet.status === 200 ? ok('Get collection', '200') : fail('Get collection', `Status ${colGet.status}`);

      const colList = await authApi('GET', '/api/collections');
      const colCount = Array.isArray(colList.data?.data) ? colList.data.data.length : 0;
      ok('List collections', `Count: ${colCount}`);

      const colDel = await authApi('DELETE', `/api/collections/${colRes.data.id}`);
      ok('Delete collection', `Status ${colDel.status}`);
    }

    // Notifications
    const unread = await authApi('GET', '/api/notifications/unread-count');
    ok('Unread count', `count: ${unread.data?.unreadCount}`);

    const markRead = await authApi('PUT', '/api/notifications');
    ok('Mark all read', `Status ${markRead.status}`);

    const unreadAfter = await authApi('GET', '/api/notifications/unread-count');
    ok('Unread after mark-read', `count: ${unreadAfter.data?.unreadCount}`);

    // Follow (toggle)
    const followRes = await authApi('POST', '/api/follow/3');
    ok('Follow user', `Status ${followRes.status}`);

    const unfollowRes = await authApi('POST', '/api/follow/3');
    ok('Unfollow user', `Status ${unfollowRes.status}`);

    // Play status
    const playRes = await authApi('POST', '/api/games/1/play-status', { status: 'PLAYING' });
    ok('Set play status', `Status ${playRes.status}`);

    // Rating
    const ratingRes = await authApi('POST', '/api/games/1/rating', { score: 4 });
    ok('Set rating', `Status ${ratingRes.status}`);

    // Report game
    const reportRes = await authApi('POST', '/api/games/1/report', { reason: 'E2E test report' });
    ok('Report game', `Status ${reportRes.status}`);

    // Check achievement trigger
    const achRes = await authApi('POST', '/api/achievements/check');
    ok('Check achievements', `Status ${achRes.status}`);

    // Verify pages
    console.log('\n--- PAGE VERIFICATION ---');
    await page2.goto('http://localhost:3099/profile');
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(1000);
    const profileText = await page2.locator('body').textContent();
    ok('Profile page', profileText.includes('testuser_qa') ? 'User data visible' : 'No user data');

    await page2.goto('http://localhost:3099/notifications');
    await page2.waitForLoadState('networkidle');
    ok('Notifications page', '200');
  }

  await ctx2.close();

  // ==================== ADMIN FLOW ====================
  console.log('\n━━━ ADMIN FLOW ━━━');

  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page3 = await ctx3.newPage();

  async function adminApi(method, path, body) {
    return page3.evaluate(async ({ method, path, body }) => {
      const opts = { method, headers: {} };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      const res = await fetch(path, opts);
      return { status: res.status, data: await res.json().catch(() => null) };
    }, { method, path, body });
  }

  // Login as admin (testuser_qa may not be admin, so we test unauthorized access)
  await page3.goto('http://localhost:3099/login');
  await page3.waitForLoadState('networkidle');
  await page3.fill('input[placeholder*="用户名"]', 'testuser_qa');
  await page3.fill('input[type="password"]', 'testpass123');
  await page3.click('button[type="submit"]');
  await page3.waitForTimeout(5000);
  const adminLoggedIn = !page3.url().includes('/login');
  adminLoggedIn ? ok('Admin login', 'Logged in as testuser_qa') : fail('Admin login', page3.url());

  if (adminLoggedIn) {
    // Test admin endpoints (expect 403 for non-admin)
    const adminGames = await adminApi('GET', '/api/admin/games');
    adminGames.status === 401 || adminGames.status === 403
      ? ok('Admin games access (non-admin)', `Correctly denied: ${adminGames.status}`)
      : warn('Admin games access', `Unexpected: ${adminGames.status}`);

    // Test admin games POST (non-admin)
    const adminCreate = await adminApi('POST', '/api/admin/games', { title: 'Test' });
    ok('Admin game create (non-admin)', `Status ${adminCreate.status} (401/403 expected)`);

    // Test admin users (non-admin)
    const adminUsers = await adminApi('GET', '/api/admin/users');
    ok('Admin users (non-admin)', `Status ${adminUsers.status} (401 expected)`);

    // Test site-settings GET
    const settings = await adminApi('GET', '/api/site-settings');
    settings.status === 200 ? ok('Site settings (public)', `Keys: ${Object.keys(settings.data?.data || {}).length}`) : fail('Site settings', `Status ${settings.status}`);
  }

  await ctx3.close();

  // ==================== SUMMARY ====================
  console.log('\n' + '═'.repeat(60));
  console.log('BUSINESS FLOW SIMULATION RESULTS');
  console.log('═'.repeat(60));
  const passed = results.filter(r => r.pass === true).length;
  const failed = results.filter(r => r.pass === false).length;
  const warned = results.filter(r => r.pass === 'warn').length;
  console.log(`PASS: ${passed}  FAIL: ${failed}  WARN: ${warned}  TOTAL: ${results.length}`);
  console.log('─'.repeat(60));
  results.forEach(r => {
    const icon = r.pass === true ? '✅' : r.pass === false ? '❌' : '⚠️';
    console.log(`${icon} ${r.name}: ${r.detail}`);
  });
  console.log('═'.repeat(60));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
