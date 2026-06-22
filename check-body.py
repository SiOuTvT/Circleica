from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 检查 body 和 html 的样式
    body_styles = page.evaluate('''() => {
        const html = document.documentElement;
        const body = document.body;

        const htmlStyle = window.getComputedStyle(html);
        const bodyStyle = window.getComputedStyle(body);

        return {
            html: {
                bg: htmlStyle.backgroundColor,
                borderTop: htmlStyle.borderTop,
                borderBottom: htmlStyle.borderBottom,
                borderLeft: htmlStyle.borderLeft,
                borderRight: htmlStyle.borderRight,
                boxShadow: htmlStyle.boxShadow,
                outline: htmlStyle.outline
            },
            body: {
                bg: bodyStyle.backgroundColor,
                borderTop: bodyStyle.borderTop,
                borderBottom: bodyStyle.borderBottom,
                borderLeft: bodyStyle.borderLeft,
                borderRight: bodyStyle.borderRight,
                boxShadow: bodyStyle.boxShadow,
                outline: bodyStyle.outline
            }
        };
    }''')

    import json
    print("HTML 和 BODY 样式:")
    print(json.dumps(body_styles, indent=2))

    # 检查两个卡片之间的间隙
    gap_info = page.evaluate('''() => {
        const aside = document.querySelector('aside.w-full');
        const main = document.querySelector('main');

        if (!aside || !main) return null;

        const asideRect = aside.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();

        return {
            asideRight: asideRect.right,
            mainLeft: mainRect.left,
            gap: mainRect.left - asideRect.right,
            asideY: asideRect.top,
            mainY: mainRect.top
        };
    }''')

    print(f"\n卡片间隙信息:")
    print(json.dumps(gap_info, indent=2))

    # 截图
    page.screenshot(path='d:/fangame/body-styles.png', full_page=True)
    browser.close()
    print("\n截图：d:/fangame/body-styles.png")