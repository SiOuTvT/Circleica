from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 检查页面垂直中心附近的元素
    vertical_center_info = page.evaluate('''() => {
        const results = [];
        const viewportHeight = window.innerHeight;
        const centerY = viewportHeight / 2;

        // 查找页面垂直中心线附近 100px 范围内的所有元素
        document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            // 检查是否在垂直中心附近
            if (Math.abs(rect.top - centerY) < 150 || Math.abs(rect.bottom - centerY) < 150) {
                const borderTop = style.borderTop;
                const borderBottom = style.borderBottom;
                const borderTopWidth = parseFloat(style.borderTopWidth);
                const borderBottomWidth = parseFloat(style.borderBottomWidth);
                const bg = style.backgroundColor;
                const boxShadow = style.boxShadow;

                // 检查是否可能是横线
                if ((borderTopWidth > 0 || borderBottomWidth > 0) && rect.width > 200) {
                    results.push({
                        tag: el.tagName,
                        className: el.className || '',
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height,
                        borderTopWidth: borderTopWidth,
                        borderBottomWidth: borderBottomWidth,
                        borderTop: borderTop,
                        borderBottom: borderBottom,
                        bg: bg,
                        boxShadow: boxShadow
                    });
                }
            }
        });

        return {
            viewportHeight,
            centerY,
            lines: results
        };
    }''')

    import json
    print(f"视口高度：{vertical_center_info['viewportHeight']}")
    print(f"垂直中心 Y 坐标：{vertical_center_info['centerY']}")
    print(f"\n找到 {len(vertical_center_info['lines'])} 个垂直中心附近的横线元素:\n")

    for i, el in enumerate(vertical_center_info['lines'][:10]):
        print(f"{i+1}. <{el['tag']}> at y={el['y']:.1f}, w={el['width']:.1f}, h={el['height']:.1f}")
        print(f"   class: {el['className'][:60]}")
        print(f"   borderTopWidth: {el['borderTopWidth']}px, borderBottomWidth: {el['borderBottomWidth']}px")
        print(f"   borderTop: {el['borderTop']}")
        print(f"   borderBottom: {el['borderBottom']}")
        print(f"   bg: {el['bg']}")
        print()

    # 截图
    page.screenshot(path='d:/fangame/vertical-center.png', full_page=True)
    browser.close()
    print("截图：d:/fangame/vertical-center.png")