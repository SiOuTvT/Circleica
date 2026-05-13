/**
 * Inline script to prevent flash of wrong theme color.
 * Reads from localStorage and applies CSS variables before React hydrates.
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var color = localStorage.getItem('site-theme-color');
        if (!color) return;
        color = color.replace('#', '');
        var r = parseInt(color.substring(0, 2), 16);
        var g = parseInt(color.substring(2, 4), 16);
        var b = parseInt(color.substring(4, 6), 16);
        var root = document.documentElement;
        
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
        var isDark = root.classList.contains('dark');
        if (isDark) {
          var primaryDark = darken(hex, 0.15);
          root.style.setProperty('--primary', primaryDark);
          root.style.setProperty('--ring', primaryDark);
          root.style.setProperty('--clr-blue', primaryDark);
          root.style.setProperty('--clr-sky', lighten(hex, 0.25));
          root.style.setProperty('--clr-glow', hex + '1F');
        } else {
          root.style.setProperty('--primary', hex);
          root.style.setProperty('--ring', hex);
          root.style.setProperty('--clr-blue', darken(hex, 0.2));
          root.style.setProperty('--clr-sky', lighten(hex, 0.15));
          root.style.setProperty('--clr-glow', hex + '1F');
          var lum = 0.299*(r/255) + 0.587*(g/255) + 0.114*(b/255);
          root.style.setProperty('--primary-foreground', lum > 0.6 ? '#18181b' : '#ffffff');
        }
      } catch(e) {}
    })();
  `

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}