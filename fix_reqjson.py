#!/usr/bin/env python3
"""模式A(M15): 将全项目直接的 req.json() 调用统一替换为 safeParseJson(req)。
排除 api-handler.ts（parseBody 定义本身）与 validations.ts（其 parseBody 已安全）。
"""
import re
import os
import sys

ROOT = r"D:\fangame\src"
EXCLUDE = {
    os.path.join(ROOT, "lib", "api-handler.ts"),
    os.path.join(ROOT, "lib", "validations.ts"),
}

# 匹配 import { ... } from '@/lib/api-handler' 或 "..."
IMPORT_RE = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]@/lib/api-handler[\'"]')
REQ_JSON_RE = re.compile(r'await\s+req\.json\(\)\.catch\(\(\)\s*=>\s*\{\}\)')
REQ_JSON_SIMPLE = re.compile(r'await\s+req\.json\(\)')

def process_file(path, apply):
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    if "req.json()" not in src:
        return None
    orig = src

    # 1) 替换 .catch(() => ({})) 变体
    new = REQ_JSON_RE.sub("await safeParseJson(req, { allowEmpty: true })", src)
    # 2) 替换普通变体
    new = REQ_JSON_SIMPLE.sub("await safeParseJson(req)", new)

    # 3) 处理 import（基于原始 src 判断，避免被上面的替换干扰）
    needs_import = "safeParseJson" not in src
    if needs_import:
        m = IMPORT_RE.search(new)
        if m:
            names = m.group(1)
            if "safeParseJson" not in names:
                new_names = names.rstrip().rstrip(",")
                new_names = (new_names + ", safeParseJson") if new_names.strip() else "safeParseJson"
                new_import = m.group(0).replace(m.group(1), new_names, 1)
                new = new.replace(m.group(0), new_import, 1)
        else:
            # 在第一个 import 块之后插入新 import
            lines = new.split("\n")
            insert_idx = 0
            for i, line in enumerate(lines):
                if line.strip().startswith("import "):
                    insert_idx = i + 1
                elif line.strip() and not line.strip().startswith("//") and not line.strip().startswith("import"):
                    break
            lines.insert(insert_idx, 'import { safeParseJson } from "@/lib/api-handler"')
            new = "\n".join(lines)

    if new != orig and apply:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
    return new != orig

def main():
    apply = "--apply" in sys.argv
    changed = []
    for dirpath, _, files in os.walk(ROOT):
        for fn in files:
            if not fn.endswith(".ts"):
                continue
            full = os.path.join(dirpath, fn)
            if full in EXCLUDE:
                continue
            res = process_file(full, apply)
            if res:
                changed.append(os.path.relpath(full, ROOT))
    print(f"[{'APPLY' if apply else 'DRYRUN'}] changed {len(changed)} files:")
    for c in changed:
        print("  -", c)

if __name__ == "__main__":
    main()
