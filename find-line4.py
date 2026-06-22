from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 获取所有关键元素的位置
    layout_info = page.evaluate('''() => {
        const elements = {
            'body': document.body,
            'main-container': document.querySelector('.flex.lg\\:flex-row'),
            'aside': document.querySelector('aside.w-full'),
            'main': document.querySelector('main'),
            'profile-content-tabs': document.querySelector('.profile-scroll-area')?.parentElement,
        };

        const results = {};
        for (const [key, el] of Object.entries(elements)) {
            if (el) {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                results[key] = {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    borderTop: style.borderTop,
                    borderBottom: style.borderBottom,
                    borderTopWidth: parseFloat(style.borderTopWidth),
                    borderBottomWidth: parseFloat(style.borderBottomWidth),
                    bg: style.backgroundColor,
                    boxShadow: style.boxShadow,
                    outline: style.outline,
                    outlineWidth: parseFloat(style.outlineWidth)
                };
            }
        }

        // 查找所有 sticky 元素
        results['sticky-elements'] = [];
        document.querySelectorAll('.sticky, [class*="sticky"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            results['sticky-elements'].push({
                className: el.className,
                y: rect.top,
                height: rect.height,
                borderTop: style.borderTop,
                borderBottom: style.borderBottom,
                borderTopWidth: parseFloat(style.borderTopWidth),
                borderBottomWidth: parseFloat(style.borderBottomWidth)
            });
        });

        return results;
    }''')

    import json
    print(json.dumps(layout_info, indent=2, default=str))

    # 截图
    page.screenshot(path='d:/fangame/layout.png', full_page=True)
    browser.close()
    print("\n截图：d:/fangame/layout.png")