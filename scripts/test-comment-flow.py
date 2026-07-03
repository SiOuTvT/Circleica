from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 667})
    page = context.new_page()

    # Login
    page.goto('http://localhost:3000/login')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    for inp in page.query_selector_all('input'):
        t = inp.get_attribute('type') or 'text'
        if t in ('text', 'email'):
            inp.fill('test_qa_user')
        elif t == 'password':
            inp.fill('TestPass123!')
            break
    page.query_selector('button[type="submit"]').click()
    page.wait_for_timeout(3000)
    try:
        page.wait_for_load_state('networkidle', timeout=5000)
    except:
        pass
    print("[OK] Logged in" if '/login' not in page.url else "[FAIL] Login failed")
    if '/login' in page.url:
        browser.close()
        exit(1)

    # Navigate to forum post
    page.goto('http://localhost:3000/forum/cmr5h5h5d0001tlhcx8ayxc3i')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)

    # Find the comment text input (type=text, with placeholder)
    comment_input = None
    for inp in page.query_selector_all('input'):
        t = inp.get_attribute('type') or 'text'
        ph = inp.get_attribute('placeholder') or ''
        if t == 'text' and ('评论' in ph or '写下' in ph):
            comment_input = inp
            break

    if comment_input:
        print("[OK] Found comment input")

        # Type a comment
        comment_input.click()
        page.wait_for_timeout(300)
        comment_input.fill('Playwright automated test comment')
        page.wait_for_timeout(500)

        # Check submit button state now
        submit_btn = page.query_selector('button[type="submit"]')
        if submit_btn:
            btn_text = submit_btn.text_content().strip()
            btn_disabled = submit_btn.get_attribute('disabled')
            print(f"Submit button after typing: text='{btn_text}' disabled={btn_disabled}")

            if btn_disabled is None:
                # Set up response listener
                responses = []
                def on_response(response):
                    if 'comment' in response.url:
                        body = None
                        try:
                            body = response.text()[:300] if response.status != 200 else None
                        except:
                            pass
                        responses.append({'url': response.url, 'status': response.status, 'body': body})
                page.on('response', on_response)

                print("Clicking submit...")
                submit_btn.click()
                page.wait_for_timeout(5000)

                print(f"\nAPI responses ({len(responses)}):")
                for r in responses:
                    print(f"  [{r['status']}] {r['url'][:80]}")
                    if r['body']:
                        print(f"       body: {r['body'][:200]}")

                page.screenshot(path='/tmp/comment-result.png', full_page=True)

                # Check if comment appeared
                comment_visible = page.evaluate('() => document.body.innerText.includes("Playwright")')
                print(f"\nComment visible: {comment_visible}")

                # Check toast
                toast = page.evaluate('''() => {
                    const toasts = document.querySelectorAll('[data-sonner-toaster] [data-sonner-toast]');
                    return Array.from(toasts).map(t => t.textContent).join(' | ');
                }''')
                if toast:
                    print(f"Toast: {toast}")
            else:
                print("[WARN] Submit button still disabled after typing")
                page.screenshot(path='/tmp/comment-btn-disabled.png')
        else:
            print("[FAIL] No submit button found")
    else:
        print("[FAIL] Comment input not found")
        # Debug: list all inputs
        for inp in page.query_selector_all('input'):
            t = inp.get_attribute('type') or 'text'
            ph = inp.get_attribute('placeholder') or ''
            cls = (inp.get_attribute('class') or '')[:80]
            print(f"  input type={t} placeholder={ph} class={cls}")

    browser.close()
    print("\nDone.")
