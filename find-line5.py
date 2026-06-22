from playwright.sync_api import sync_playwright
import time
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 获取所有关键元素的位置
    layout_info = page.evaluate('''() => {
        const results = {};

        // 查找 main 元素
        const main = document.querySelector('main');
        if (main) {
            const rect = main.getBoundingClientRect();
            const style = window.getComputedStyle(main);
            results['main'] = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                className: main.className,
                borderTop: style.borderTop,
                borderBottom: style.borderBottom,
                borderTopWidth: parseFloat(style.borderTopWidth),
                borderBottomWidth: parseFloat(style.borderBottomWidth)
            };
        }

        // 查找 aside 元素
        const asides = document.querySelectorAll('aside');
        results['asides'] = [];
        asides.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            results['asides'].push({
                index: i,
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                className: el.className,
                borderTop: style.borderTop,
                borderBottom: style.borderBottom,
                borderTopWidth: parseFloat(style.borderTopWidth),
                borderBottomWidth: parseFloat(style.borderBottomWidth)
            });
        });

        // 查找所有 sticky 元素
        results['sticky-elements'] = [];
        document.querySelectorAll('[class*="sticky"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            results['sticky-elements'].push({
                className: el.className,
                y: rect.top,
                height: rect.height,
                borderTop: style.borderTop,
                borderBottom: style.borderBottom,
                borderTopWidth: parseFloat(style.borderTopWidth),
                borderBottomWidth: parseFloat(style.borderBottomWidth),
                bg: style.backgroundColor
            });
        });

        // 查找所有 profile-scroll-area
        const scrollAreas = document.querySelectorAll('.profile-scroll-area');
        results['scroll-areas'] = [];
        scrollAreas.forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            results['scroll-areas'].push({
                className: el.className,
                y: rect.top,
                height: rect.height,
                borderTop: style.borderTop,
                borderBottom: style.borderBottom,
                borderTopWidth: parseFloat(style.borderTopWidth),
                borderBottomWidth: parseFloat(style.borderBottomWidth),
                overflowY: style.overflowY
            });
        });

        return results;
    }''')

    print(json.dumps(layout_info, indent=2, default=str))

    # 截图
    page.screenshot(path='d:/fangame/layout-info.png', full_page=True)
    browser.close()
    print("\n截图：d:/fangame/layout-info.png")