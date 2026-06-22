from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 检查 sticky 容器的详细样式
    sticky_info = page.evaluate('''() => {
        const sticky = document.querySelector('.sticky.top-0.z-10');
        if (!sticky) return null;

        const rect = sticky.getBoundingClientRect();
        const style = window.getComputedStyle(sticky);

        return {
            className: sticky.className,
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            borderTop: style.borderTop,
            borderBottom: style.borderBottom,
            borderTopWidth: style.borderTopWidth,
            borderBottomWidth: style.borderBottomWidth,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            bg: style.backgroundColor,
            boxShadow: style.boxShadow,
            // 检查 pseudo 元素
            beforeContent: window.getComputedStyle(sticky, '::before').content,
            afterContent: window.getComputedStyle(sticky, '::after').content,
            beforeBorder: window.getComputedStyle(sticky, '::before').borderBottom,
            afterBorder: window.getComputedStyle(sticky, '::after').borderTop
        };
    }''')

    import json
    print("Sticky 容器信息:")
    print(json.dumps(sticky_info, indent=2, default=str))

    # 截图
    page.screenshot(path='d:/fangame/sticky.png', full_page=True)
    browser.close()
    print("\n截图：d:/fangame/sticky.png")