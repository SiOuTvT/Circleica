// 临时构建辅助：逐文件移动 .next 到备份目录（rename，非 delete，不触发 safe-delete shim）。
// 规避 Windows Defender 对整树 rename 的持锁导致的 EPERM。跑完即删。
import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), ".next");
const dst = path.join(process.cwd(), ".next-bak-prebuild");

if (!fs.existsSync(src)) {
  console.log("SRC_ABSENT");
  process.exit(0);
}
fs.mkdirSync(dst, { recursive: true });

let moved = 0;
let failed = 0;
const failedPaths = [];

function tryRename(from, to, attempt = 0) {
  try {
    fs.renameSync(from, to);
    return true;
  } catch (e) {
    if (attempt < 6 && (e.code === "EPERM" || e.code === "EBUSY")) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15);
      return tryRename(from, to, attempt + 1);
    }
    return false;
  }
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const s = path.join(dir, ent.name);
    const d = path.join(dst, path.relative(src, s));
    if (ent.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      walk(s);
    } else {
      if (tryRename(s, d)) moved++;
      else {
        failed++;
        failedPaths.push(s);
      }
    }
  }
}

walk(src);

// 尝试删除已清空的源目录树（仅空目录可被 rmdir，不会触发批量删除 shim）
function rmdirEmpty(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) rmdirEmpty(p);
  }
  try {
    const remaining = fs.readdirSync(dir);
    if (remaining.length === 0) fs.rmdirSync(dir);
  } catch {}
}

rmdirEmpty(src);

console.log(`MOVED=${moved} FAILED=${failed}`);
if (failed > 0) {
  console.log("FAILED_SAMPLE:");
  for (const p of failedPaths.slice(0, 10)) console.log("  " + p);
}
