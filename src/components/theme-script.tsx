import { headers } from "next/headers"

/**
 * Inline script to prevent flash of wrong theme color.
 * Reads from localStorage and applies CSS variables before React hydrates.
 * Also handles dark/light mode: follows system preference on first visit,
 * then respects user's explicit choice from localStorage.
 */
export async function ThemeScript() {
  const nonce = (await headers()).get("x-nonce") || undefined
  const script = `
    (function() {
      try {
        var root = document.documentElement;
        
        // ── Dark/Light mode: support dark / light / system ──
        var storedMode = localStorage.getItem('theme');

        function applyMode(mode) {
          var isLight = false;
          if (mode === 'light') {
            isLight = true;
          } else if (mode === 'dark') {
            isLight = false;
          } else {
            // system or unset → follow OS preference
            isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
          }
          root.classList.toggle('light', isLight);
          root.classList.toggle('dark', !isLight);
        }

        applyMode(storedMode);

        // Listen for OS theme changes when in system mode
        if (!storedMode || storedMode === 'system') {
          window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
            if (localStorage.getItem('theme') === 'system' || !localStorage.getItem('theme')) {
              applyMode('system');
            }
          });
        }
        
        var raw = localStorage.getItem('site-theme-settings');
        var settings = raw ? JSON.parse(raw) : null;
        var color = settings ? settings.themeColor : localStorage.getItem('site-theme-color');
        if (!color) return;
        color = color.replace('#', '');
        var r = parseInt(color.substring(0, 2), 16);
        var g = parseInt(color.substring(2, 4), 16);
        var b = parseInt(color.substring(4, 6), 16);
        var radius = settings ? settings.themeRadius : 12;
        var shadowIntensity = settings ? settings.themeShadowIntensity : 50;
        var alpha = settings ? settings.themeAlpha : 15;
        
        function darken(hex, amt) {
          hex = hex.replace('#', '');
          var dr = Math.max(0, Math.round(parseInt(hex.substring(0,2),16) * (1-amt)));
          var dg = Math.max(0, Math.round(parseInt(hex.substring(2,4),16) * (1-amt)));
          var db = Math.max(0, Math.round(parseInt(hex.substring(4,6),16) * (1-amt)));
          return '#' + dr.toString(16).padStart(2,'0') + dg.toString(16).padStart(2,'0') + db.toString(16).padStart(2,'0');
        }
        function lighten(hex, amt) {
          hex = hex.replace('#', '');
          var lr = Math.min(255, Math.round(parseInt(hex.substring(0,2),16) + (255-parseInt(hex.substring(0,2),16))*amt));
          var lg = Math.min(255, Math.round(parseInt(hex.substring(2,4),16) + (255-parseInt(hex.substring(2,4),16))*amt));
          var lb = Math.min(255, Math.round(parseInt(hex.substring(4,6),16) + (255-parseInt(hex.substring(4,6),16))*amt));
          return '#' + lr.toString(16).padStart(2,'0') + lg.toString(16).padStart(2,'0') + lb.toString(16).padStart(2,'0');
        }
        
        var hex = '#' + color;
        var glowOpacity = (alpha / 100) * 0.75;
        var isDark = root.classList.contains('dark');
        if (isDark) {
          var primaryDark = darken(hex, 0.05);
          root.style.setProperty('--primary', primaryDark);
          root.style.setProperty('--ring', primaryDark);
          root.style.setProperty('--accent', lighten(hex, 0.15));
          root.style.setProperty('--clr-blue', primaryDark);
          root.style.setProperty('--clr-sky', lighten(hex, 0.2));
          root.style.setProperty('--clr-glow', 'rgba(' + r + ',' + g + ',' + b + ',' + glowOpacity + ')');
        } else {
          root.style.setProperty('--primary', hex);
          root.style.setProperty('--ring', hex);
          root.style.setProperty('--accent', lighten(hex, 0.45));
          root.style.setProperty('--clr-blue', darken(hex, 0.2));
          root.style.setProperty('--clr-sky', lighten(hex, 0.15));
          root.style.setProperty('--clr-glow', 'rgba(' + r + ',' + g + ',' + b + ',' + glowOpacity + ')');
        }
        // 全局主题色原始 hex（供链接、NProgress、focus ring 等直接引用）
        root.style.setProperty('--theme-color', hex);
        // Hover / Active 加深色
        root.style.setProperty('--theme-color-hover', darken(hex, 0.15));
        root.style.setProperty('--theme-color-active', darken(hex, 0.25));
        // 前景文字（白/黑自动判定）
        var fg = (0.299*(r/255) + 0.587*(g/255) + 0.114*(b/255)) > 0.6 ? '#18181b' : '#ffffff';
        root.style.setProperty('--primary-foreground', fg);
        root.style.setProperty('--theme-fg', fg);

        // Common variables
        root.style.setProperty('--clr-warm', '#f59e0b');
        root.style.setProperty('--theme-radius', radius + 'px');
        root.style.setProperty('--theme-shadow-intensity', (shadowIntensity / 100).toString());
        root.style.setProperty('--theme-alpha', (alpha / 100).toString());
        // 计算色相
        var r2 = r / 255, g2 = g / 255, b2 = b / 255;
        var cmax = Math.max(r2, g2, b2), cmin = Math.min(r2, g2, b2), hue = 0;
        if (cmax !== cmin) {
          var cd = cmax - cmin;
          if (cmax === r2) hue = ((g2 - b2) / cd + (g2 < b2 ? 6 : 0)) * 60;
          else if (cmax === g2) hue = ((b2 - r2) / cd + 2) * 60;
          else hue = ((r2 - g2) / cd + 4) * 60;
        }
        root.style.setProperty('--theme-hue', Math.round(hue).toString());
        root.style.setProperty('--theme-r', r.toString());
        root.style.setProperty('--theme-g', g.toString());
        root.style.setProperty('--theme-b', b.toString());
      } catch(e) {}
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