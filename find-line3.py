from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 获取右侧卡片的位置和内部元素
    right_card_info = page.evaluate('''() => {
        const main = document.querySelector('main');
        if (!main) return null;

        const mainRect = main.getBoundingClientRect();

        // 查找 main 内部的所有元素
        const results = [];
        main.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // 相对于视口的位置
            if (rect.width > 100 && rect.height > 0) {
                const borderTop = style.borderTop;
                const borderBottom = style.borderBottom;
                const borderTopWidth = parseFloat(style.borderTopWidth);
                const borderBottomWidth = parseFloat(style.borderBottomWidth);
                const bg = style.backgroundColor;

                // 检查是否可能是一条横线
                if ((borderTopWidth > 0 || borderBottomWidth > 0) && rect.height < 5) {
                    results.push({
                        tag: el.tagName,
                        className: el.className || '',
                        width: rect.width,
                        height: rect.height,
                        x: rect.left,
                        y: rect.top,
                        borderTopWidth: borderTopWidth,
                        borderBottomWidth: borderBottomWidth,
                        borderTop: borderTop,
                        borderBottom: borderBottom,
                        bg: bg
                    });
                }
            }
        });

        return {
            mainX: mainRect.left,
            mainY: mainRect.top,
            mainWidth: mainRect.width,
            mainHeight: mainRect.height,
            lines: results
        };
    }''')

    if right_card_info:
        print(f"右侧卡片位置：({right_card_info['mainX']:.1f}, {right_card_info['mainY']:.1f})")
        print(f"右侧卡片尺寸：{right_card_info['mainWidth']:.1f} x {right_card_info['mainHeight']:.1f}")
        print(f"\n右侧卡片内找到 {len(right_card_info['lines'])} 条横线:\n")

        for i, line in enumerate(right_card_info['lines'][:10]):
            print(f"{i+1}. <{line['tag']}> at ({line['x']:.1f}, {line['y']:.1f})")
            print(f"   尺寸：{line['width']:.1f} x {line['height']:.1f}")
            print(f"   class: {line['className'][:60]}")
            print(f"   borderTopWidth: {line['borderTopWidth']}px, borderBottomWidth: {line['borderBottomWidth']}px")
            print(f"   borderTop: {line['borderTop']}")
            print(f"   borderBottom: {line['borderBottom']}")
            print(f"   bg: {line['bg']}")
            print()

    # 截图
    page.screenshot(path='d:/fangame/right-card.png', full_page=True)
    browser.close()
    print("截图：d:/fangame/right-card.png")