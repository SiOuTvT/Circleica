// 临时验证脚本：检查 nonce CSP 是否真正生效（请求头 nonce 与 HTML 内联脚本 nonce 对齐）。
const BASE = "http://localhost:3100";
const paths = ["/", "/games", "/login", "/galvelica", "/search", "/discover", "/ranking"];

function extractCspNonce(csp) {
  // 取 script-src 里的第一个 nonce-xxx
  const m = csp && csp.match(/'nonce-([^']+)'/);
  return m ? m[1] : null;
}

async function check(path) {
  let res, html, csp;
  try {
    res = await fetch(BASE + path, { redirect: "manual" });
  } catch (e) {
    return { path, error: String(e) };
  }
  csp = res.headers.get("content-security-policy");
  html = await res.text();
  const cspNonce = extractCspNonce(csp);

  // 收集所有 <script ...> 标签
  const scriptTags = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
  const stats = { total: scriptTags.length, withNonce: 0, mismatch: [], noNonceInline: [] };
  for (const attrs of scriptTags) {
    const hasSrc = /\bsrc\s*=/.test(attrs);
    const nm = attrs.match(/\bnonce\s*=\s*["']([^"']+)["']/);
    if (hasSrc) {
      // 外链脚本：Next 会为其补 nonce（同源 chunk 由 nonce bootstrap 加载）
      if (nm) stats.withNonce++;
      // 外链无 nonce 不计入内联违规，仅记录
    } else {
      // 内联脚本：必须带 nonce 且与 CSP nonce 一致
      if (nm) {
        stats.withNonce++;
        if (cspNonce && nm[1] !== cspNonce) stats.mismatch.push(nm[1]);
      } else {
        stats.noNonceInline.push(attrs.slice(0, 80));
      }
    }
  }

  return {
    path,
    status: res.status,
    hasCsp: !!csp,
    cspHasNonce: !!cspNonce,
    cspScriptSrc: csp ? (csp.match(/script-src[^;]*/) || [])[0] : null,
    cspNoncePreview: cspNonce ? cspNonce.slice(0, 12) + "…" : null,
    scriptStats: stats,
    htmlBytes: html.length,
    htmlHasContent: html.includes("__next") || html.length > 2000,
  };
}

for (const p of paths) {
  const r = await check(p);
  console.log("========================================");
  console.log(JSON.stringify(r, null, 2));
}
