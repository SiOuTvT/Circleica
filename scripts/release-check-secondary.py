"""
Secondary check: verify pages rendered real content,
and probe additional routes that might 404.
"""

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

# Pages to check with expected content indicators
PAGES_TO_VERIFY = [
    ("/", ["<main", "<footer", "class=", "id="]),
    ("/games/1", ["<main", "class="]),
    ("/forum", ["<main", "class="]),
    ("/search", ["<main", "class="]),
    ("/login", ["<main", "class=", "login", "Login"]),
    ("/tags", ["<main", "class="]),
]

# Additional routes to probe for 404s
PROBE_ROUTES = [
    "/games",
    "/games/999999",
    "/forum/new",
    "/forum/1",
    "/profile",
    "/admin",
    "/api/games",
    "/tags",
]

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # ---- Content verification ----
        print("=== Content Verification ===\n")
        for path, indicators in PAGES_TO_VERIFY:
            resp = page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=30000)
            status = resp.status if resp else "no response"
            html = page.content()
            body_text = page.inner_text("body")
            has_content = len(body_text.strip()) > 50
            print(f"  {path:20s}  status={status}  html_len={len(html):6d}  body_chars={len(body_text.strip()):5d}  content={'YES' if has_content else 'SPARSE'}")
            if not has_content:
                preview = body_text.strip()[:200]
                print(f"                        body preview: {preview!r}")

        # ---- Probe extra routes ----
        print("\n=== Additional Route Probing ===\n")
        for path in PROBE_ROUTES:
            try:
                resp = page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=15000)
                status = resp.status if resp else "no response"
                title = page.title()
                marker = ""
                if status == 404:
                    marker = " *** 404 ***"
                elif status == 500:
                    marker = " *** 500 ***"
                print(f"  {path:30s}  status={status}  title={title!r}{marker}")
            except Exception as exc:
                print(f"  {path:30s}  ERROR: {exc}")

        browser.close()

    print("\nDONE")

if __name__ == "__main__":
    run()
