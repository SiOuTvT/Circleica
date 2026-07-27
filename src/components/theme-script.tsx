import { headers } from "next/headers"
import { resolveThemeTokens } from "@/lib/theme-colors-shared"

/**
 * Inline script to prevent flash of wrong theme.
 * Applies --primary (and aliases) directly from resolved tokens.
 * hover / active / soft tokens are owned by globals.css via color-mix,
 * so any theme color (incl. custom) stays coherent and never mechanically darkened.
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
        // Apply tokens — primary + aliases only; hover/active/soft derived in CSS
        r.style.setProperty('--primary','${t.primary}');
        r.style.setProperty('--theme-color','${t.primary}');
        r.style.setProperty('--theme-color-hover','${t.primary}');
        r.style.setProperty('--theme-color-active','${t.primary}');
        r.style.setProperty('--clr-blue','${t.primary}');
        r.style.setProperty('--clr-sky','${t.accent}');
        r.style.setProperty('--ring','${t.ring}');
        r.style.setProperty('--clr-glow','${t.glow}');
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
