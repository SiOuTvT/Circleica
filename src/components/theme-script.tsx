/**
 * Inline script to prevent flash of wrong theme (dark/light toggle only).
 *
 * nonce 由根 layout 从请求头 x-nonce 读取后透传（proxy.ts 每请求生成）。
 * 配合 CSP `script-src 'self' 'nonce-…' 'strict-dynamic'`，本脚本与 Next 自身
 * 注入的 framework / RSC-flight 内联脚本共享同一 nonce，strict-dynamic 下全部放行，
 * 既能防 XSS（无 nonce 的注入脚本被拦）又不影响主题切换。
 */
const THEME_SCRIPT = "(function(){try{var r=document.documentElement,m=r.classList,s=localStorage.getItem('theme'),isLight=false;if(s==='light')isLight=true;else if(s!=='dark')isLight=window.matchMedia('(prefers-color-scheme:light)').matches;m.toggle('light',isLight);m.toggle('dark',!isLight);if(!s||s==='system'){window.matchMedia('(prefers-color-scheme:light)').addEventListener('change',function(){if(!localStorage.getItem('theme')||localStorage.getItem('theme')==='system'){var l=window.matchMedia('(prefers-color-scheme:light)').matches;r.classList.toggle('light',l);r.classList.toggle('dark',!l);}});}}catch(e){}})();"

export function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
      suppressHydrationWarning
    />
  )
}
