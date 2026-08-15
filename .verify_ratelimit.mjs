// 临时验证脚本：A) 游戏详情页 JSON-LD 的 CSP 处理；B) 匿名限流是否真触发 429。
const BASE = "http://localhost:3100";

// ── A) 详情页 + JSON-LD ──
const gamesHtml = await (await fetch(BASE + "/games")).text();
const m = gamesHtml.match(/\/games\/(\d+)/);
const detailPath = m ? "/games/" + m[1] : null;
let detailReport = { detailPath, error: "no link found" };
if (detailPath) {
  const res = await fetch(BASE + detailPath);
  const html = await res.text();
  const csp = res.headers.get("content-security-policy");
  const cspNonce = csp && csp.match(/'nonce-([^']+)'/);
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((x) => x[1]);
  const jsonLd = [...html.matchAll(/<script\b([^>]*type="application\/ld\+json"[^>]*)>/g)].map((x) => x[1]);
  const inlineNoNonce = scripts.filter((a) => !/\bsrc\s*=/.test(a) && !/\bnonce\s*=/.test(a));
  detailReport = {
    detailPath,
    status: res.status,
    cspHasNonce: !!cspNonce,
    totalScripts: scripts.length,
    inlineScriptsWithoutNonce: inlineNoNonce.length,
    inlineWithoutNonceSamples: inlineNoNonce.slice(0, 3),
    jsonLdBlocks: jsonLd.length,
    jsonLdHasNonce: jsonLd.length ? jsonLd.every((a) => /\bnonce\s*=/.test(a)) : null,
    note: "application/ld+json 为非执行型脚本，浏览器不按 script-src 拦截，无需 nonce",
  };
}
console.log("=== A) DETAIL / JSON-LD ===");
console.log(JSON.stringify(detailReport, null, 2));

// ── B) 匿名 API 限流（阈值 120/min）──
const IP = "9.9.9.9";
let ok = 0, limited = 0, first429 = -1;
for (let i = 0; i < 140; i++) {
  const r = await fetch(BASE + "/api/games?page=1", { headers: { "X-Forwarded-For": IP } });
  if (r.status === 429) { limited++; if (first429 < 0) first429 = i + 1; }
  else ok++;
}
console.log("=== B) RATE LIMIT (anon /api GET, X-Forwarded-For spoof) ===");
console.log(JSON.stringify({ ok, limited, first429StatusAt: first429 }, null, 2));

// ── C) 页面限流（阈值 500/min）──
let pok = 0, plimited = 0, pFirst429 = -1;
for (let i = 0; i < 520; i++) {
  const r = await fetch(BASE + "/", { headers: { "X-Forwarded-For": "8.8.8.8" }, redirect: "manual" });
  if (r.status === 429) { plimited++; if (pFirst429 < 0) pFirst429 = i + 1; }
  else pok++;
}
console.log("=== C) RATE LIMIT (anon PAGE GET, X-Forwarded-For spoof) ===");
console.log(JSON.stringify({ ok: pok, limited: plimited, first429StatusAt: pFirst429 }, null, 2));
