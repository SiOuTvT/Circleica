from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 检查页面中心的元素
    center_info = page.evaluate('''() => {
        const results = [];
        const viewportWidth = window.innerWidth;
        const centerX = viewportWidth / 2;

        // 查找页面中心线附近的元素
        document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            // 检查是否跨越页面中心线
            if (rect.left < centerX + 50 && rect.right > centerX - 50) {
                const borderTop = style.borderTop;
                const borderBottom = style.borderBottom;
                const borderTopWidth = parseFloat(style.borderTopWidth);
                const borderBottomWidth = parseFloat(style.borderBottomWidth);
                const bg = style.backgroundColor;
                const isTransparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';

                if (borderTopWidth > 0 || borderBottomWidth > 0) {
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
                        isCenterCrossing: true
                    });
                }
            }
        });

        // 按 y 坐标排序
        results.sort((a, b) => a.y - b.y);

        return {
            viewportWidth,
            centerX,
            lines: results
        };
    }''')

    import json
    print(f"视口宽度：{center_info['viewportWidth']}")
    print(f"中心 X 坐标：{center_info['centerX']}")
    print(f"\n找到 {len(center_info['lines'])} 个跨越中心的有边框元素:\n")

    for i, el in enumerate(center_info['lines'][:15]):
        print(f"{i+1}. <{el['tag']}> at y={el['y']:.1f}, w={el['width']:.1f}")
        print(f"   class: {el['className'][:60]}")
        print(f"   borderTopWidth: {el['borderTopWidth']}px, borderBottomWidth: {el['borderBottomWidth']}px")
        print(f"   borderTop: {el['borderTop']}")
        print(f"   bg: {el['bg']}")
        print()

    # 截图
    page.screenshot(path='d:/fangame/center-line.png', full_page=True)
    browser.close()
    print("截图：d:/fangame/center-line.png")