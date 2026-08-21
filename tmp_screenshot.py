from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    page.screenshot(path='/tmp/circleica_home.png', full_page=True)
    # Also take a viewport screenshot
    page.screenshot(path='/tmp/circleica_viewport.png')
    browser.close()
