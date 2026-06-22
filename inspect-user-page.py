from playwright.sync_api import sync_playwright
import time
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    # 访问用户主页，使用 serialId
    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(3)

    # 截取完整屏幕截图
    page.screenshot(path='d:/fangame/user-page-full.png', full_page=True)

    # 查找所有可能有横线的元素
    lines = page.evaluate('''() => {
        const results = [];

        // 检查所有 border、boxShadow、background 可能产生横线的元素
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // 只检查宽度大于 200px 的水平元素
            if (rect.width > 200 && rect.height < 10) {
                const hasBorder = style.borderTop !== 'none' || style.borderBottom !== 'none';
                const hasShadow = style.boxShadow !== 'none';
                const bg = style.backgroundColor;
                const isOpaque = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';

                if (hasBorder || hasShadow || isOpaque) {
                    results.push({
                        tag: el.tagName,
                        className: el.className || '',
                        id: el.id || '',
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        x: Math.round(rect.left),
                        y: Math.round(rect.top),
                        borderTop: style.borderTop,
                        borderBottom: style.borderBottom,
                        boxShadow: style.boxShadow,
                        bg: bg,
                        position: style.position
                    });
                }
            }
        });

        // 按 y 坐标排序，找出最靠近"粉丝"字样的横线
        return results.sort((a, b) => a.y - b.y);
    }''')

    print("=== 水平线条元素 ===")
    for i, line in enumerate(lines[:20]):
        print(f"\n{i+1}. {line['tag']} - y={line['y']}, h={line['height']}, w={line['width']}")
        print(f"   位置：x={line['x']}")
        print(f"   class: {line['className'][:80]}..." if len(line['className']) > 80 else f"   class: {line['className']}")
        print(f"   borderTop: {line['borderTop']}")
        print(f"   borderBottom: {line['borderBottom']}")
        print(f"   boxShadow: {line['boxShadow']}")
        print(f"   bg: {line['bg']}")

    # 专门查找 sticky 元素
    sticky_elements = page.evaluate('''() => {
        const stickies = [];
        document.querySelectorAll('.sticky, [style*="sticky"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            stickies.push({
                tag: el.tagName,
                className: el.className,
                y: rect.top,
                height: rect.height,
                borderBottom: style.borderBottom,
                bg: style.backgroundColor
            });
        });
        return stickies;
    }''')

    print("\n=== Sticky 元素 ===")
    for el in sticky_elements:
        print(f"  {el['tag']} y={el['y']}, h={el['height']}")
        print(f"    borderBottom: {el['borderBottom']}")

    browser.close()
    print("\n截图已保存到：d:/fangame/user-page-full.png")