import { headers } from "next/headers"
import { THEME_PRESETS, DEFAULT_TOKENS, type ThemeTokens } from "@/lib/theme-presets"

/**
 * 根据 SiteSetting 中存储的 themeColor hex，解析出完整的 ThemeTokens。
 * 如果是预设色 → 使用人工调好的 token 集；
 * 如果是自定义色 → 使用原 hex 本身（不做自动派生）。
 */
export function resolveThemeTokens(themeColor?: string): ThemeTokens {
  if (themeColor) {
    const preset = THEME_PRESETS.find((p) => p.color.toLowerCase() === themeColor.toLowerCase())
    if (preset) return preset.tokens
  }
  return DEFAULT_TOKENS
}

/**
 * Inline script to prevent flash of wrong theme.
 * Applies preset tokens directly — no auto-derivation.
 */
export async function ThemeScript({ themeColor }: { themeColor?: string }) {
  const nonce = (await headers()).get("x-nonce") || undefined
  const t = resolveThemeTokens(themeColor)
  const script = `
    (function(){
      try{
        var r=document.documentElement;
        var m=r.classList;
        // Dark/Light mode
        var s=localStorage.getItem('theme');
        var isLight=false;
        if(s==='light') isLight=true;
        else if(s!=='dark') isLight=window.matchMedia('(prefers-color-scheme:light)').matches;
        m.toggle('light',isLight);
        m.toggle('dark',!isLight);
        // Listen for OS changes
        if(!s||s==='system'){
          window.matchMedia('(prefers-color-scheme:light)').addEventListener('change',function(){
            if(!localStorage.getItem('theme')||localStorage.getItem('theme')==='system'){
              var l=window.matchMedia('(prefers-color-scheme:light)').matches;
              r.classList.toggle('light',l);
              r.classList.toggle('dark',!l);
            }
          });
        }
        // Apply tokens — no derivation
        r.style.setProperty('--primary','${t.primary}');
        r.style.setProperty('--primary-hover','${t.hover}');
        r.style.setProperty('--primary-active','${t.active}');
        r.style.setProperty('--accent','${t.accent}');
        r.style.setProperty('--ring','${t.ring}');
        r.style.setProperty('--clr-glow','${t.glow}');
        r.style.setProperty('--theme-color','${t.primary}');
        r.style.setProperty('--theme-color-hover','${t.hover}');
        r.style.setProperty('--theme-color-active','${t.active}');
        r.style.setProperty('--clr-blue','${t.primary}');
        r.style.setProperty('--clr-sky','${t.accent}');
      }catch(e){}
    })();
  `

  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
