from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto('http://localhost:3000/user/1', wait_until='networkidle')
    time.sleep(2)

    # 检查 Tab 容器的样式
    tab_container_info = page.evaluate('''() => {
        // 找到 sticky 容器内的第一个 div（Tab 容器）
        const sticky = document.querySelector('.sticky.top-0.z-10');
        if (!sticky) return null;

        const tabContainer = sticky.querySelector('div.flex');
        if (!tabContainer) return null;

        const rect = tabContainer.getBoundingClientRect();
        const style = window.getComputedStyle(tabContainer);

        return {
            className: tabContainer.className,
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            borderTop: style.borderTop,
            borderBottom: style.borderBottom,
            borderTopWidth: style.borderTopWidth,
            borderBottomWidth: style.borderBottomWidth,
            bg: style.backgroundColor,
            boxShadow: style.boxShadow,
            // 检查是否有 inline style 设置的背景色
            inlineStyle: tabContainer.getAttribute('style')
        };
    }''')

    import json
    print("Tab 容器信息:")
    print(json.dumps(tab_container_info, indent=2, default=str))

    # 截图
    page.screenshot(path='d:/fangame/tab-container.png', full_page=True)
    browser.close()
    print("\n截图：d:/fangame/tab-container.png")