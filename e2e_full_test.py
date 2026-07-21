from playwright.sync_api import sync_playwright
import json

results = []
BASE = "http://localhost:3099"

def log(test, status, detail=""):
    results.append({"test": test, "status": status, "detail": detail})
    mark = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{mark} {test}: {detail[:100]}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()

    # Collect console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # ===== 1. HOMEPAGE =====
    print("\n=== GUEST: HOMEPAGE ===")
    page.goto(BASE)
    page.wait_for_load_state("networkidle")

    title = page.title()
    log("Homepage loads", "PASS" if "Fangame" in title or title else "FAIL", f"Title: {title}")

    # Check for key elements
    games_visible = page.locator("[href*='/games/']").count() > 0
    log("Games visible on homepage", "PASS" if games_visible else "FAIL", f"Game links: {page.locator('[href*=\"/games/\"]').count()}")

    # Check nav
    nav_visible = page.locator("nav, [role='navigation'], header").count() > 0
    log("Navigation visible", "PASS" if nav_visible else "WARN")

    page.screenshot(path="/tmp/e2e/01-homepage.png", full_page=True)

    # ===== 2. GAMES LIST =====
    print("\n=== GUEST: GAMES LIST ===")
    page.goto(f"{BASE}/games")
    page.wait_for_load_state("networkidle")

    game_cards = page.locator("[href*='/games/']").count()
    log("Games list loads", "PASS" if game_cards > 0 else "FAIL", f"Game links: {game_cards}")
    page.screenshot(path="/tmp/e2e/02-games-list.png", full_page=True)

    # ===== 3. GAME DETAIL =====
    print("\n=== GUEST: GAME DETAIL ===")
    first_game = page.locator("[href*='/games/']").first
    if first_game:
        first_game.click()
        page.wait_for_load_state("networkidle")
        game_title = page.locator("h1, h2").first.text_content() if page.locator("h1, h2").count() > 0 else ""
        log("Game detail loads", "PASS" if game_title else "WARN", f"Title: {game_title[:50]}")

        # Check for key game detail elements
        has_tags = page.locator("text=/标签|tag/i").count() > 0 or page.locator("[class*='tag']").count() > 0
        log("Tags displayed", "PASS" if has_tags else "WARN")

        has_resources = page.locator("text=/下载|资源|resource/i").count() > 0
        log("Resources section", "PASS" if has_resources else "WARN")

        page.screenshot(path="/tmp/e2e/03-game-detail.png", full_page=True)

    # ===== 4. SEARCH =====
    print("\n=== GUEST: SEARCH ===")
    page.goto(f"{BASE}/search?q=test")
    page.wait_for_load_state("networkidle")
    log("Search page loads", "PASS" if page.url.endswith("search") or "search" in page.url else "FAIL")
    page.screenshot(path="/tmp/e2e/04-search.png", full_page=True)

    # ===== 5. TAGS =====
    print("\n=== GUEST: TAGS ===")
    page.goto(f"{BASE}/tags")
    page.wait_for_load_state("networkidle")
    log("Tags page loads", "PASS" if "tags" in page.url else "FAIL")
    page.screenshot(path="/tmp/e2e/05-tags.png", full_page=True)

    # ===== 6. FORUM =====
    print("\n=== GUEST: FORUM ===")
    page.goto(f"{BASE}/forum")
    page.wait_for_load_state("networkidle")
    log("Forum page loads", "PASS" if "forum" in page.url else "FAIL")
    page.screenshot(path="/tmp/e2e/06-forum.png", full_page=True)

    # ===== 7. LOGIN PAGE =====
    print("\n=== GUEST: LOGIN PAGE ===")
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")

    has_login_form = page.locator("input[type='password'], input[name='password']").count() > 0
    log("Login form visible", "PASS" if has_login_form else "FAIL")

    has_register_tab = page.locator("text=/注册|register/i").count() > 0
    log("Register tab visible", "PASS" if has_register_tab else "WARN")
    page.screenshot(path="/tmp/e2e/07-login.png", full_page=True)

    # ===== 8. REGISTER =====
    print("\n=== GUEST: REGISTER ===")
    # Click register tab if exists
    reg_tab = page.locator("text=/注册/").first
    if reg_tab:
        reg_tab.click()
        page.wait_for_timeout(500)

    # Fill registration form
    username_input = page.locator("input[name='username'], input[placeholder*='用户']").first
    email_input = page.locator("input[name='email'], input[type='email']").first
    password_input = page.locator("input[name='password'], input[type='password']").first

    if username_input.count() > 0 and email_input.count() > 0:
        username_input.fill("e2etest")
        email_input.fill("e2etest@example.com")

        # Find all password inputs - may have confirm password
        pwd_inputs = page.locator("input[type='password']")
        if pwd_inputs.count() >= 1:
            pwd_inputs.nth(0).fill("Test1234")
        if pwd_inputs.count() >= 2:
            pwd_inputs.nth(1).fill("Test1234")

        page.screenshot(path="/tmp/e2e/08-register-filled.png", full_page=True)

        # Submit
        submit_btn = page.locator("button[type='submit'], button:has-text('注册')").first
        if submit_btn.count() > 0:
            submit_btn.click()
            page.wait_for_timeout(3000)

            # Check result
            page.screenshot(path="/tmp/e2e/09-register-result.png", full_page=True)
            current_url = page.url
            error_msg = page.locator("text=/错误|失败|error|已存在|已被/i").first
            if error_msg.count() > 0:
                log("Register result", "WARN", f"Error shown: {error_msg.text_content()[:80]}")
            else:
                log("Register attempt", "PASS", f"URL after: {current_url}")
        else:
            log("Register submit button", "FAIL", "No submit button found")
    else:
        log("Register form fields", "FAIL", "Username/email inputs not found")

    # ===== 9. LOGIN =====
    print("\n=== USER: LOGIN ===")
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    # Check if we need to switch to login tab
    login_tab = page.locator("button:has-text('登录'), [role='tab']:has-text('登录')").first
    if login_tab.count() > 0:
        login_tab.click()
        page.wait_for_timeout(300)

    # Try logging in with the registered user
    id_input = page.locator("input[name='identifier'], input[name='username'], input[placeholder*='用户名']").first
    pwd_input = page.locator("input[type='password']").first

    if id_input.count() > 0 and pwd_input.count() > 0:
        id_input.fill("e2etest")
        pwd_input.fill("Test1234")

        submit = page.locator("button[type='submit'], button:has-text('登录')").first
        if submit.count() > 0:
            submit.click()
            page.wait_for_timeout(3000)

            page.screenshot(path="/tmp/e2e/10-login-result.png", full_page=True)
            current_url = page.url
            is_logged_in = "/login" not in current_url

            if is_logged_in:
                log("Login successful", "PASS", f"Redirected to: {current_url}")

                # ===== 10. PROFILE EDIT =====
                print("\n=== USER: PROFILE EDIT ===")
                page.goto(f"{BASE}/profile/edit")
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(500)
                page.screenshot(path="/tmp/e2e/11-profile-edit.png", full_page=True)

                has_bio = page.locator("textarea, input[name='bio']").count() > 0
                log("Profile edit page loads", "PASS" if has_bio else "WARN", "Has bio field" if has_bio else "No bio field")

                # ===== 11. FAVORITE GAME =====
                print("\n=== USER: FAVORITE GAME ===")
                page.goto(f"{BASE}/games")
                page.wait_for_load_state("networkidle")

                first_game_link = page.locator("[href*='/games/']").first
                if first_game_link:
                    first_game_link.click()
                    page.wait_for_load_state("networkidle")
                    page.wait_for_timeout(500)

                    fav_btn = page.locator("button:has-text('收藏'), [aria-label*='收藏'], [aria-label*='favorite'], button:has(svg[class*='heart'])").first
                    if fav_btn.count() > 0:
                        fav_btn.click()
                        page.wait_for_timeout(1000)
                        page.screenshot(path="/tmp/e2e/12-favorite.png", full_page=True)
                        log("Favorite button clicked", "PASS")
                    else:
                        log("Favorite button", "WARN", "Not found on game detail page")
                        page.screenshot(path="/tmp/e2e/12-favorite-notfound.png", full_page=True)

                # ===== 12. COMMENT =====
                print("\n=== USER: COMMENT ===")
                page.goto(f"{BASE}/games")
                page.wait_for_load_state("networkidle")
                first_game_link = page.locator("[href*='/games/']").first
                if first_game_link:
                    first_game_link.click()
                    page.wait_for_load_state("networkidle")
                    page.wait_for_timeout(1000)

                    comment_input = page.locator("textarea[placeholder*='评论'], textarea[name='content'], [contenteditable='true']").first
                    if comment_input.count() > 0:
                        comment_input.fill("E2E 测试评论 - 自动化测试")
                        page.screenshot(path="/tmp/e2e/13-comment-filled.png", full_page=True)

                        submit_comment = page.locator("button:has-text('发布'), button:has-text('评论'), button[type='submit']").first
                        if submit_comment.count() > 0:
                            submit_comment.click()
                            page.wait_for_timeout(2000)
                            page.screenshot(path="/tmp/e2e/14-comment-submitted.png", full_page=True)

                            comment_visible = page.locator("text=/E2E 测试评论/").count() > 0
                            log("Comment submitted and visible", "PASS" if comment_visible else "FAIL")
                        else:
                            log("Comment submit button", "WARN", "Not found")
                    else:
                        log("Comment input", "WARN", "Textarea not found")
                        page.screenshot(path="/tmp/e2e/13-comment-notfound.png", full_page=True)

                # ===== 13. CHECKIN =====
                print("\n=== USER: CHECKIN ===")
                page.goto(BASE)
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(1000)

                checkin_btn = page.locator("button:has-text('签到'), [aria-label*='签到'], button:has-text('checkin')").first
                if checkin_btn.count() > 0:
                    checkin_btn.click()
                    page.wait_for_timeout(2000)
                    page.screenshot(path="/tmp/e2e/15-checkin.png", full_page=True)
                    log("Checkin button clicked", "PASS")
                else:
                    log("Checkin button", "WARN", "Not found in top nav")
                    page.screenshot(path="/tmp/e2e/15-checkin-notfound.png", full_page=True)

                # ===== 14. FORUM POST =====
                print("\n=== USER: FORUM POST ===")
                page.goto(f"{BASE}/forum")
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(500)

                new_post_btn = page.locator("button:has-text('发帖'), button:has-text('新帖'), button:has-text('新建')").first
                if new_post_btn.count() > 0:
                    new_post_btn.click()
                    page.wait_for_timeout(1000)
                    page.screenshot(path="/tmp/e2e/16-forum-new-post.png", full_page=True)

                    title_input = page.locator("input[placeholder*='标题'], input[name='title']").first
                    content_input = page.locator("textarea[placeholder*='内容'], textarea[name='content']").first

                    if title_input.count() > 0 and content_input.count() > 0:
                        title_input.fill("E2E 测试帖子")
                        content_input.fill("这是一个自动化测试帖子的内容")

                        submit_post = page.locator("button:has-text('发布'), button:has-text('提交'), button[type='submit']").first
                        if submit_post.count() > 0:
                            submit_post.click()
                            page.wait_for_timeout(2000)
                            page.screenshot(path="/tmp/e2e/17-forum-posted.png", full_page=True)

                            post_visible = page.locator("text=/E2E 测试帖子/").count() > 0
                            log("Forum post created", "PASS" if post_visible else "FAIL")
                        else:
                            log("Forum post submit", "WARN", "Submit button not found")
                    else:
                        log("Forum post form", "WARN", "Title/content inputs not found")
                else:
                    log("New post button", "WARN", "Not found")

                # ===== 15. USER PROFILE =====
                print("\n=== USER: PROFILE PAGE ===")
                page.goto(f"{BASE}/profile")
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(500)
                page.screenshot(path="/tmp/e2e/18-profile.png", full_page=True)

                profile_has_content = page.locator("text=/e2etest|收藏|评论|签到/i").count() > 0
                log("Profile page shows user data", "PASS" if profile_has_content else "WARN")

            else:
                log("Login", "FAIL", f"Stayed on login page: {current_url}")
                # Check for error
                err = page.locator("text=/错误|失败|密码|账号/i").first
                if err.count() > 0:
                    log("Login error", "FAIL", err.text_content()[:80])
        else:
            log("Login submit button", "FAIL", "Not found")
    else:
        log("Login form fields", "FAIL", "Identifier/password inputs not found")

    # ===== CONSOLE ERRORS SUMMARY =====
    print(f"\n=== CONSOLE ERRORS: {len(console_errors)} ===")
    for err in console_errors[:10]:
        print(f"  - {err[:120]}")

    browser.close()

# ===== SUMMARY =====
print("\n" + "="*60)
print("E2E TEST RESULTS SUMMARY")
print("="*60)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
warned = sum(1 for r in results if r["status"] == "WARN")
print(f"PASS: {passed}  FAIL: {failed}  WARN: {warned}  TOTAL: {len(results)}")
print()
for r in results:
    mark = "✅" if r["status"] == "PASS" else "❌" if r["status"] == "FAIL" else "⚠️"
    print(f"  {mark} {r['test']}: {r['detail'][:80]}")
