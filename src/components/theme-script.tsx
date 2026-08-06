/**
 * Inline script to prevent flash of wrong theme (dark/light toggle only).
 *
 * 设计要点（性能优化 P2）：
 * - 不再依赖服务端 nonce / themeColor：根 layout 已移除 headers() 调用，
 *   全站从「强制 dynamic」变为「各页按需 static」。
 * - themeColor 的 CSS 变量改由 layout 通过内联 <style> 注入（style-src 允许 'unsafe-inline'）。
 * - 本脚本只做 light/dark 切换（纯客户端、内容完全固定），由 proxy.ts 的 CSP
 *   用 'sha256-<hash>' 放行，无需 nonce，从而彻底免除对 headers() 的依赖。
 * - 脚本内容必须保持单行固定，否则 CSP hash 失配会被浏览器拦截。
 */
const THEME_SCRIPT = "(function(){try{var r=document.documentElement,m=r.classList,s=localStorage.getItem('theme'),isLight=false;if(s==='light')isLight=true;else if(s!=='dark')isLight=window.matchMedia('(prefers-color-scheme:light)').matches;m.toggle('light',isLight);m.toggle('dark',!isLight);if(!s||s==='system'){window.matchMedia('(prefers-color-scheme:light)').addEventListener('change',function(){if(!localStorage.getItem('theme')||localStorage.getItem('theme')==='system'){var l=window.matchMedia('(prefers-color-scheme:light)').matches;r.classList.toggle('light',l);r.classList.toggle('dark',!l);}});}}catch(e){}})();"

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
      suppressHydrationWarning
    />
  )
}
