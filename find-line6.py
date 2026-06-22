from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 专门检查 y=222 附近的元素
    lines = page.evaluate('''() => {
        const results = [];
        const targetY = 222;

        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // 检查 y=222 附近 50px 范围内的元素
            if (Math.abs(rect.top - targetY) < 50 || Math.abs(rect.bottom - targetY) < 50) {
                const borderTopWidth = parseFloat(style.borderTopWidth);
                const borderBottomWidth = parseFloat(style.borderBottomWidth);
                const borderTop = style.borderTop;
                const borderBottom = style.borderBottom;
                const bg = style.backgroundColor;
                const boxShadow = style.boxShadow;

                if (borderTopWidth > 0 || borderBottomWidth > 0 || boxShadow !== 'none') {
                    results.push({
                        tag: el.tagName,
                        className: el.className || '',
                        y: rect.top,
                        bottom: rect.bottom,
                        height: rect.height,
                        width: rect.width,
                        borderTop: borderTop,
                        borderBottom: borderBottom,
                        borderTopWidth: borderTopWidth,
                        borderBottomWidth: borderBottomWidth,
                        bg: bg,
                        boxShadow: boxShadow
                    });
                }
            }
        });

        return results;
    }''')

    print(f"在 y=222 附近找到 {len(lines)} 个有边框的元素:\n")
    for i, el in enumerate(lines[:10]):
        print(f"{i+1}. <{el['tag']}> y={el['y']:.1f} - {el['bottom']:.1f}, h={el['height']:.1f}, w={el['width']:.1f}")
        print(f"   class: {el['className'][:70]}")
        print(f"   borderTop: {el['borderTop']}")
        print(f"   borderBottom: {el['borderBottom']}")
        print(f"   bg: {el['bg']}")
        print(f"   boxShadow: {el['boxShadow'][:80] if el['boxShadow'] else 'none'}")
        print()

    # 截图
    page.screenshot(path='d:/fangame/y222.png', full_page=True)
    browser.close()
    print("截图：d:/fangame/y222.png")