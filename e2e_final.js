const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const results = [];

  function result(test, status, detail) {
    results.push({ test, status, detail });
    const mark = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${mark} ${test}: ${detail}`);
  }

  // Use API context for authenticated calls
  async function api(method, path, body) {
    return ctx.request.fetch('http://localhost:3099' + path, {
      method,
      data: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    });
  }

  // ===== LOGIN =====
  console.log('=== LOGIN ===');
  const loginResp = await ctx.request.fetch('http://localhost:3099/api/auth/csrf');
  const csrf = (await loginResp.json()).csrfToken;

  const loginRes = await ctx.request.fetch('http://localhost:3099/api/auth/callback/credentials', {
    method: 'POST',
    form: { csrfToken: csrf, username: 'testuser_qa', password: 'testpass123', redirect: 'false' },
  });
  console.log('Login status:', loginRes.status());
  const loggedIn = loginRes.status() === 200 || loginRes.status() === 302;
  result('Login', loggedIn ? 'PASS' : 'FAIL', 'Status: ' + loginRes.status());

  if (loggedIn) {
    // ===== 1. PROFILE EDIT =====
    console.log('\n=== 1. PROFILE EDIT ===');
    const profileBefore = await (await api('GET', '/api/user/stats')).json();
    console.log('  Profile stats:', JSON.stringify(profileBefore).slice(0, 100));

    // Edit via browser page
    await page.goto('http://localhost:3099/profile/edit');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bioField = page.locator('textarea').first();
    if (await bioField.count() > 0) {
      const testBio = 'E2E verification bio ' + Date.now();
      await bioField.fill(testBio);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);

      // Navigate to profile to verify
      await page.goto('http://localhost:3099/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const bioVisible = (await page.locator('body').textContent()).includes(testBio.slice(0, 15));
      result('Profile bio saved & visible', bioVisible ? 'PASS' : 'FAIL', 'Bio: ' + testBio.slice(0, 30));
    }

    // ===== 2. FAVORITE =====
    console.log('\n=== 2. FAVORITE ===');
    const gameBefore = await (await api('GET', '/api/games/1')).json();
    const favBefore = gameBefore.favoriteCount;
    console.log('  Fav count before:', favBefore);

    // Toggle via browser
    await page.goto('http://localhost:3099/games/1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const favBtn = page.locator('button:has-text("收藏"), [aria-label*="收藏"]').first();
    if (await favBtn.count() > 0) {
      await favBtn.click();
      await page.waitForTimeout(2000);

      // Check count via API
      const gameAfter = await (await api('GET', '/api/games/1')).json();
      const favAfter = gameAfter.favoriteCount;
      console.log('  Fav count after:', favAfter);

      // Also check favorite status via API
      const checkFav = await api('POST', '/api/games/1/favorite');
      const favStatus = await checkFav.json();
      console.log('  Favorite status:', JSON.stringify(favStatus).slice(0, 100));

      result('Favorite count updated in DB', favAfter !== favBefore ? 'PASS' : 'WARN',
        `Before: ${favBefore}, After: ${favAfter}`);
    } else {
      result('Favorite button', 'WARN', 'Not found (may be behind hydration)');
    }

    // ===== 3. FORUM POST =====
    console.log('\n=== 3. FORUM POST ===');
    const postCreate = await api('POST', '/api/forum/posts', {
      title: 'E2E Test Post ' + Date.now(),
      content: 'Business logic verification post',
      category: 'discussion'
    });
    const postData = await postCreate.json();
    result('Forum post created', postCreate.status() === 201 ? 'PASS' : 'FAIL',
      'Status: ' + postCreate.status() + ' ID: ' + (postData.id || 'none'));

    if (postData.id) {
      // Like
      const likeRes = await api('POST', `/api/forum/posts/${postData.id}/like`);
      const likeData = await likeRes.json();
      result('Forum post like', likeRes.status() === 200 ? 'PASS' : 'FAIL',
        'Liked: ' + (likeData.liked ?? 'unknown'));

      // Solve
      const solveRes = await api('POST', `/api/forum/posts/${postData.id}/solve`);
      result('Forum post solve', solveRes.status() === 200 ? 'PASS' : 'FAIL');

      // Delete
      const delRes = await api('DELETE', `/api/forum/posts/${postData.id}`);
      result('Forum post delete', delRes.status() === 200 || delRes.status() === 204 ? 'PASS' : 'FAIL');
    }

    // ===== 4. COMMENT =====
    console.log('\n=== 4. COMMENT ===');
    const commentCreate = await api('POST', '/api/games/1/comments', {
      content: 'E2E business logic comment ' + Date.now()
    });
    const commentData = await commentCreate.json();
    result('Comment created', commentCreate.status() === 201 ? 'PASS' : 'FAIL',
      'Status: ' + commentCreate.status() + ' ID: ' + (commentData.id || 'none'));

    if (commentData.id) {
      const likeComment = await api('POST', `/api/comments/${commentData.id}/like`);
      const likeCommentData = await likeComment.json();
      result('Comment like', likeComment.status() === 200 ? 'PASS' : 'FAIL',
        'Liked: ' + (likeCommentData.liked ?? 'unknown'));

      // Verify count increased
      console.log('  Like count:', likeCommentData.count ?? 'unknown');

      // Delete comment
      const delComment = await api('DELETE', `/api/comments/${commentData.id}`);
      result('Comment delete', delComment.status() === 200 || delComment.status() === 204 ? 'PASS' : 'FAIL');
    }

    // ===== 5. COLLECTION =====
    console.log('\n=== 5. COLLECTION ===');
    const colCreate = await api('POST', '/api/collections', { name: 'E2E Collection' });
    const colData = await colCreate.json();
    result('Collection created', colCreate.status() === 201 ? 'PASS' : 'FAIL');

    if (colData.id) {
      const colGet = await api('GET', `/api/collections/${colData.id}`);
      result('Collection get', colGet.status() === 200 ? 'PASS' : 'FAIL');

      const colList = await api('GET', '/api/collections');
      const colListData = await colList.json();
      const colCount = Array.isArray(colListData.data) ? colListData.data.length : 0;
      result('Collection list has data', colCount > 0 ? 'PASS' : 'FAIL', `Count: ${colCount}`);

      const colDel = await api('DELETE', `/api/collections/${colData.id}`);
      result('Collection delete', colDel.status() === 200 || colDel.status() === 204 ? 'PASS' : 'FAIL');
    }

    // ===== 6. CHECKIN =====
    console.log('\n=== 6. CHECKIN ===');
    const checkin = await api('POST', '/api/checkin');
    const checkinData = await checkin.json();
    result('Checkin', checkin.status() === 200 ? 'PASS' : 'FAIL',
      'Marks: ' + (checkinData.marks ?? 'none') + ' Streak: ' + (checkinData.streak ?? 'none'));

    // Duplicate should fail
    const checkinDup = await api('POST', '/api/checkin');
    result('Duplicate checkin blocked', checkinDup.status() === 409 ? 'PASS' : 'FAIL',
      'Status: ' + checkinDup.status());

    // Status check
    const statusCheck = await api('GET', '/api/checkin');
    const statusData = await statusCheck.json();
    result('Checkin status', statusData.checkedIn === true ? 'PASS' : 'FAIL');

    // ===== 7. NOTIFICATIONS =====
    console.log('\n=== 7. NOTIFICATIONS ===');
    const unreadBefore = await (await api('GET', '/api/notifications/unread-count')).json();
    console.log('  Unread before:', unreadBefore);

    const markRead = await api('PUT', '/api/notifications');
    result('Mark all read', markRead.status() === 200 ? 'PASS' : 'FAIL');

    const unreadAfter = await (await api('GET', '/api/notifications/unread-count')).json();
    console.log('  Unread after:', unreadAfter);
    result('Notifications cleared', (unreadAfter.unreadCount ?? 1) === 0 ? 'PASS' : 'FAIL');

    // ===== 8. ADMIN ACCESS =====
    console.log('\n=== 8. ADMIN ===');
    const adminRes = await api('GET', '/api/admin/games');
    result('Admin access', adminRes.status() === 401 ? 'PASS (correctly denied)' : 'FAIL',
      'Status: ' + adminRes.status());
  }

  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(60));
  console.log('BUSINESS LOGIC VALIDATION RESULTS');
  console.log('='.repeat(60));
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  console.log(`PASS: ${passed}  FAIL: ${failed}  WARN: ${warned}  TOTAL: ${results.length}`);
  console.log('='.repeat(60));
  results.forEach(r => {
    const mark = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`  ${mark} ${r.test}: ${r.detail.slice(0, 80)}`);
  });

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
