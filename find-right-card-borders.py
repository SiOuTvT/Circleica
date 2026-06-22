from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 检查右侧卡片区域的详细样式
    right_card_styles = page.evaluate('''() => {
        const results = [];

        // 找到 main 元素内的所有 div
        const main = document.querySelector('main');
        if (!main) return results;

        const allDivs = main.querySelectorAll('*');
        allDivs.forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            const borderTopWidth = parseFloat(style.borderTopWidth);
            const borderBottomWidth = parseFloat(style.borderBottomWidth);
            const borderLeftWidth = parseFloat(style.borderLeftWidth);
            const borderRightWidth = parseFloat(style.borderRightWidth);

            if (borderTopWidth > 0 || borderBottomWidth > 0 || borderLeftWidth > 0 || borderRightWidth > 0) {
                results.push({
                    tag: el.tagName,
                    className: el.className || '',
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    borderTopWidth: borderTopWidth,
                    borderBottomWidth: borderBottomWidth,
                    borderLeftWidth: borderLeftWidth,
                    borderRightWidth: borderRightWidth,
                    borderTop: style.borderTop,
                    borderBottom: style.borderBottom,
                    borderLeft: style.borderLeft,
                    borderRight: style.borderRight,
                    bg: style.backgroundColor
                });
            }
        });

        return results;
    }''')

    import json
    print(f"右侧卡片区域找到 {len(right_card_styles)} 个有边框的元素:\n")

    for i, el in enumerate(right_card_styles[:15]):
        print(f"{i+1}. <{el['tag']}> at ({el['x']:.1f}, {el['y']:.1f}), {el['width']:.1f}x{el['height']:.1f}")
        print(f"   class: {el['className'][:60]}")
        print(f"   borderTop: {el['borderTopWidth']}px, borderBottom: {el['borderBottomWidth']}px")
        print(f"   borderLeft: {el['borderLeftWidth']}px, borderRight: {el['borderRightWidth']}px")
        print(f"   borderTop style: {el['borderTop']}")
        print(f"   bg: {el['bg']}")
        print()

    # 截图
    page.screenshot(path='d:/fangame/right-card-borders.png', full_page=True)
    browser.close()
    print("截图：d:/fangame/right-card-borders.png")