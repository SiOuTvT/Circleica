import { chromium } from "playwright";
import * as fs from "fs";

const VIEWPORTS = [
  { name: "320", width: 320, height: 568 },
  { name: "375", width: 375, height: 812 },
  { name: "390", width: 390, height: 844 },
  { name: "414", width: 414, height: 896 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
];

const PAGES = [
  { name: "home", url: "/" },
  { name: "games", url: "/games" },
  { name: "game-detail", url: "/games/1" },
  { name: "search", url: "/search" },
  { name: "tags", url: "/tags" },
  { name: "forum", url: "/forum" },
  { name: "collections", url: "/collections" },
  { name: "login", url: "/login" },
  { name: "credits", url: "/credits" },
  { name: "admin", url: "/admin" },
  { name: "admin-games", url: "/admin/games" },
  { name: "admin-users", url: "/admin/users" },
  { name: "admin-tags", url: "/admin/tags" },
  { name: "admin-reports", url: "/admin/reports" },
  { name: "admin-forum", url: "/admin/forum" },
];

interface Issue {
  page: string;
  viewport: string;
  type: string;
  detail: string;
}

async function audit() {
  const browser = await chromium.launch();
  const issues: Issue[] = [];
  const outDir = "responsive-audit";
  fs.mkdirSync(outDir, { recursive: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();

    for (const pg of PAGES) {
      try {
        await page.goto(`http://localhost:3000${pg.url}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await page.waitForTimeout(500);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const viewWidth = document.documentElement.clientWidth;
          return docWidth > viewWidth ? docWidth - viewWidth : 0;
        });
        if (overflow > 5) {
          issues.push({
            page: pg.name,
            viewport: vp.name,
            type: "horizontal-overflow",
            detail: `${overflow}px overflow`,
          });
        }

        // Check for elements wider than viewport
        const overflows = await page.evaluate((vw) => {
          const results: string[] = [];
          document.querySelectorAll("*").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > vw + 5 && rect.width > 0) {
              const tag = el.tagName.toLowerCase();
              const cls = (el as HTMLElement).className?.toString().slice(0, 60) || "";
              results.push(`${tag}.${cls} right=${Math.round(rect.right)}`);
            }
          });
          return results.slice(0, 5);
        }, vp.width);
        if (overflows.length > 0) {
          issues.push({
            page: pg.name,
            viewport: vp.name,
            type: "element-overflow",
            detail: overflows.join("; "),
          });
        }

        // Check for text truncation issues (text overflowing containers)
        const textOverflow = await page.evaluate(() => {
          const results: string[] = [];
          document.querySelectorAll("p, h1, h2, h3, h4, span, td, th").forEach((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (
              rect.width > 0 &&
              el.scrollWidth > el.clientWidth + 2 &&
              style.overflow !== "hidden" &&
              style.textOverflow !== "ellipsis" &&
              !el.classList.contains("truncate") &&
              !el.classList.contains("line-clamp-1") &&
              !el.classList.contains("line-clamp-2")
            ) {
              results.push(`${el.tagName}.${el.className?.toString().slice(0, 40)}`);
            }
          });
          return results.slice(0, 3);
        });
        if (textOverflow.length > 0) {
          issues.push({
            page: pg.name,
            viewport: vp.name,
            type: "text-overflow",
            detail: textOverflow.join("; "),
          });
        }

        // Check tap targets (buttons/links < 44px)
        const smallTargets = await page.evaluate(() => {
          const results: string[] = [];
          document.querySelectorAll("a, button, [role='button']").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40)) {
              const text = el.textContent?.trim().slice(0, 20) || el.tagName;
              results.push(`${text} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
            }
          });
          return results.slice(0, 3);
        });
        if (smallTargets.length > 0 && vp.width <= 414) {
          issues.push({
            page: pg.name,
            viewport: vp.name,
            type: "small-tap-target",
            detail: smallTargets.join("; "),
          });
        }

        // Screenshot
        const ssPath = `${outDir}/${vp.name}-${pg.name}.png`;
        await page.screenshot({ path: ssPath, fullPage: false });
      } catch (e) {
        // Page might 404, that's ok
      }
    }
    await ctx.close();
  }
  await browser.close();

  // Output results
  console.log("=== RESPONSIVE AUDIT RESULTS ===");
  console.log(`Total issues: ${issues.length}`);

  // Group by type
  const byType = issues.reduce(
    (acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log("\n=== ISSUES BY PAGE ===");
  const byPage = issues.reduce(
    (acc, i) => {
      acc[i.page] = acc[i.page] || [];
      acc[i.page].push(i);
      return acc;
    },
    {} as Record<string, Issue[]>
  );
  Object.entries(byPage).forEach(([page, items]) => {
    console.log(`\n${page}:`);
    items.forEach((i) => console.log(`  [${i.viewport}] ${i.type}: ${i.detail}`));
  });

  // Save JSON for further analysis
  fs.writeFileSync(`${outDir}/issues.json`, JSON.stringify(issues, null, 2));
}

audit().catch(console.error);
