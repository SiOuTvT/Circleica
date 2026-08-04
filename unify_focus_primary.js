const fs = require('fs');
const path = require('path');
const root = 'D:/Circleica/src';
const exts = new Set(['.tsx', '.ts', '.jsx', '.js']);
let count = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      walk(p);
    } else if (exts.has(path.extname(e.name))) {
      let s = fs.readFileSync(p, 'utf8');
      const lines = s.split('\n');
      let changed = false;
      const newLines = lines.map((line) => {
        if (line.includes('focus:border-ring') || line.includes('focus-within:border-ring')) {
          let nl = line;
          if (nl.includes('border border-input')) nl = nl.replaceAll('border border-input', 'border-2 border-input');
          if (nl.includes('focus:border-ring')) nl = nl.replaceAll('focus:border-ring', 'focus:border-primary');
          if (nl.includes('focus-within:border-ring')) nl = nl.replaceAll('focus-within:border-ring', 'focus-within:border-primary');
          if (nl !== line) changed = true;
          return nl;
        }
        return line;
      });
      if (changed) { fs.writeFileSync(p, newLines.join('\n')); count++; }
    }
  }
}
walk(root);
console.log('files modified:', count);
