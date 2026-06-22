from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 查找在 y=486 附近（粉丝元素下方）的所有元素
    lines = page.evaluate('''() => {
        const results = [];
        const targetY = 486;

        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // 检查是否在目标 Y 坐标附近，且宽度较大
            if (rect.width > 200 && rect.top > targetY - 100 && rect.top < targetY + 300) {
                // 检查是否有任何可能显示为横线的样式
                const borderTop = style.borderTop;
                const borderBottom = style.borderBottom;
                const borderTopWidth = parseFloat(style.borderTopWidth);
                const borderBottomWidth = parseFloat(style.borderBottomWidth);
                const boxShadow = style.boxShadow;
                const bg = style.backgroundColor;
                const isTransparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';

                // 检查 outline
                const outline = style.outline;
                const outlineWidth = parseFloat(style.outlineWidth);

                if (borderTopWidth > 0 || borderBottomWidth > 0 || outlineWidth > 0 || (!isTransparent && rect.height < 5)) {
                    results.push({
                        tag: el.tagName,
                        className: el.className || '',
                        id: el.id || '',
                        width: rect.width,
                        height: rect.height,
                        x: rect.left,
                        y: rect.top,
                        borderTop: borderTop,
                        borderBottom: borderBottom,
                        borderTopWidth: borderTopWidth,
                        borderBottomWidth: borderBottomWidth,
                        outline: outline,
                        outlineWidth: outlineWidth,
                        bg: bg,
                        position: style.position
                    });
                }
            }
        });

        // 排序
        results.sort((a, b) => a.y - b.y);
        return results;
    }''')

    print(f"找到 {len(lines)} 个可能的横线元素:\n")
    for i, el in enumerate(lines[:15]):
        print(f"{i+1}. <{el['tag']}> at ({el['x']:.1f}, {el['y']:.1f}) - {el['width']:.1f}x{el['height']:.1f}")
        print(f"   class: {el['className'][:70]}...")
        print(f"   borderTopWidth: {el['borderTopWidth']}px, borderBottomWidth: {el['borderBottomWidth']}px")
        print(f"   outlineWidth: {el['outlineWidth']}px")
        print(f"   bg: {el['bg']}")
        print(f"   position: {el['position']}")
        print()

    # 截图
    page.screenshot(path='d:/fangame/line-found.png', full_page=True)
    browser.close()
    print("截图：d:/fangame/line-found.png")