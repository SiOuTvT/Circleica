from playwright.sync_api import sync_playwright

URLS = [
    ("discover", "http://localhost:3000/discover"),
    ("galvelica", "http://localhost:3000/galvelica"),
    ("credits-creator", "http://localhost:3000/credits/creator"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for name, url in URLS:
        for w, label in [(1280, "desktop"), (390, "mobile")]:
            page = browser.new_page(viewport={"width": w, "height": 900})
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: errors.append("PAGEERROR: " + str(exc)))
            try:
                page.goto(url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=20000)
            except Exception as e:
                print(f"{name}/{label}: GOTO/WAIT ERROR {str(e)[:120]}")
            try:
                overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 2")
            except Exception:
                overflow = "n/a"
            print(f"{name}/{label}: console_errors={len(errors)} overflow_x={overflow}")
            for e in errors[:6]:
                print("   ERR:", e[:180])
            page.screenshot(path=f"d:/Circleica/_shot_{name}_{label}.png", full_page=False)
            page.close()
    browser.close()
print("DONE")
