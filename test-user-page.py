from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('http://localhost:3000/user/1')
    page.wait_for_load_state('networkidle')

    # Take a full screenshot to see the layout
    page.screenshot(path='d:/fangame/user-page.png', full_page=True)

    # Check for any visible scrollbars or borders
    scrollbars = page.locator('*::-webkit-scrollbar')
    print(f"Found {scrollbars.count()} scrollbars")

    # Find the profile scroll area
    profile_area = page.locator('.profile-scroll-area')
    print(f"Profile scroll area visible: {profile_area.count() > 0}")

    # Check for any horizontal lines/borders
    borders = page.locator('[style*="border"], [class*="border"], hr')
    print(f"Found {borders.count()} border elements")

    browser.close()