from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    # 访问用户主页
    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 找到"粉丝"元素的位置 - 使用 textContent
    fan_location = page.evaluate('''() => {
        const allText = document.body.textContent || '';
        // 找到所有包含文本的元素
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while(node = walker.nextNode()) {
            if (node.textContent.includes('粉丝')) {
                const range = document.createRange();
                range.selectNode(node);
                const rect = range.getBoundingClientRect();
                return { x: rect.left, y: rect.top, text: node.textContent.trim() };
            }
        }
        return null;
    }''')

    print(f"'粉丝' 位置：{fan_location}")

    # 查找所有有 border 或 background 的水平元素
    all_elements = page.evaluate('''() => {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // 检查是否是水平的长条
            if (rect.width > 100 && rect.height > 0 && rect.height < 3) {
                const borderTop = style.borderTop;
                const borderBottom = style.borderBottom;
                const boxShadow = style.boxShadow;
                const bg = style.backgroundColor;

                if (borderTop !== 'none' || borderBottom !== 'none' || boxShadow !== 'none') {
                    results.push({
                        tag: el.tagName,
                        className: el.className || '',
                        width: rect.width,
                        height: rect.height,
                        x: rect.left,
                        y: rect.top,
                        borderTop: borderTop,
                        borderBottom: borderBottom,
                        boxShadow: boxShadow,
                        bg: bg
                    });
                }
            }
        });
        return results;
    }''')

    print(f"\n找到 {len(all_elements)} 个水平线条元素:")
    for i, el in enumerate(all_elements[:20]):
        print(f"\n{i+1}. {el['tag']} at ({el['x']}, {el['y']}) - {el['width']}x{el['height']}")
        print(f"   class: {el['className'][:80]}")
        print(f"   borderTop: {el['borderTop']}")
        print(f"   borderBottom: {el['borderBottom']}")
        print(f"   boxShadow: {el['boxShadow'][:100] if el['boxShadow'] else 'none'}")

    # 截图
    page.screenshot(path='d:/fangame/line-inspect.png', full_page=True)
    browser.close()
    print("\n截图：d:/fangame/line-inspect.png")