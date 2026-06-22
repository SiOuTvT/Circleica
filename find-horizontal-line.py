from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    # 访问用户主页
    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 找到"粉丝"元素的位置
    fan_location = page.evaluate('''() => {
        // 找到包含"粉丝"文本的元素
        const fanElements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.includes('粉丝')
        );

        if (fanElements.length > 0) {
            const rect = fanElements[0].getBoundingClientRect();
            return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        }
        return null;
    }''')

    print(f"'粉丝' 元素位置：{fan_location}")

    # 在粉丝元素下方查找横线
    if fan_location:
        lines_below = page.evaluate(f'''() => {{
            const fanY = {fan_location['y']};
            const results = [];

            // 查找粉丝元素下方 200px 范围内的所有水平线条
            document.querySelectorAll('*').forEach(el => {{
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();

                // 检查是否在粉丝元素下方且是水平的
                if (rect.top > fanY - 50 && rect.top < fanY + 200 && rect.width > 300 && rect.height < 5) {{
                    const hasBorder = style.borderTopWidth !== '0px' || style.borderBottomWidth !== '0px';
                    const bg = style.backgroundColor;
                    const isGrey = bg && (bg.includes('128') || bg.includes('rgb(26, 26, 26)') || bg.includes('rgba(128'));

                    if (hasBorder || isGrey) {{
                        results.push({{
                            tag: el.tagName,
                            className: el.className || '',
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            x: Math.round(rect.left),
                            y: Math.round(rect.top),
                            borderTopWidth: style.borderTopWidth,
                            borderBottomWidth: style.borderBottomWidth,
                            bg: bg,
                            elementType: el.tagName
                        }});
                    }}
                }}
            }});
            return results;
        }}''')

        print(f"\n在'粉丝'下方找到 {len(lines_below)} 个可能的横线元素:")
        for i, line in enumerate(lines_below[:10]):
            print(f"\n{i+1}. {line['tag']} - y={line['y']}, h={line['height']}, w={line['width']}")
            print(f"   横跨：x={line['x']} 到 x={line['x']+line['width']}")
            print(f"   class: {line['className'][:100]}")
            print(f"   borderTopWidth: {line['borderTopWidth']}, borderBottomWidth: {line['borderBottomWidth']}")
            print(f"   bg: {line['bg']}")

    # 截图
    page.screenshot(path='d:/fangame/user-page-with-markers.png', full_page=True)

    browser.close()
    print("\n截图已保存到：d:/fangame/user-page-with-markers.png")