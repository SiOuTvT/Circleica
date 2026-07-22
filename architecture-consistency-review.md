# Architecture Consistency Review — Round 2（2026-07-21 续）

## 目标
按用户指令，从**架构一致性**角度收敛全项目：凡已存在统一实现（Single Source of Truth）处不允许保留第二份；循环扫描、发现一处收敛一处，直至零重复。覆盖：重复组件 / 重复逻辑 / 重复工具 / 重复请求方式 / 重复状态管理 / 重复权限 / 重复样式 / 重复工具函数。

## 本轮收敛成果

### 1. 请求层（重复请求方式，最大收敛面）
- 发现一个**并发的自动迁移进程**正在把内部 `/api/*` 裸 `fetch` 系统收敛到 `lib/api-client.ts`（`api` / `apiFetchSafe` / `api.get/post/put/delete`）。已覆盖 `forum-client`、`notifications-client`、`admin-games-table`、`creator-detail-client`、`curated-collections` 等核心文件。
- 本回合**手动收敛约 14 个文件**：`login`（注册）、`follow-button`、`feedback-btn`、`email-verification-banner`、`comment-section`（like/delete）、`achievement-modal`、`checkin-toast`、`character-detail-client`、`admin-nav`、`admin-global-search`、`credits-client` 等。
- **正当例外（保留裸 fetch，非重复）**：
  - FormData 上传 ×6：`comment-section` / `forum-client` / `forum/post-detail-modal` / `forum-post-detail`（发帖带图）、`setup-wizard`、`admin/checkin-config-editor` 上传。
  - 服务端外部调用 ×2：`api/admin/services` 的 `config.url/ping`、`api/admin/vndb` 的 VNDB_API（属上游客户端，非应用内请求 SSOT）。
- 剩余内部 JSON fetch **约 13 处**（admin 各管理页、`forum-sidebar`、`theme-provider`、`tag-groups-manager`）由自动进程收尾。

### 2. 重复工具函数
- `stripHtml` 在两组件各内联一份（`announce-swiper`、`announcements-manager`）→ 收敛到 `lib/sanitize.ts` 的 DOMPurify 版 SSOT。**既统一又提升安全性**（正则版可被编码绕过，DOMPurify 版 XSS 安全）。

### 3. 已确认干净的类别（零重复，无需改动）
| 类别 | 结论 |
|------|------|
| 重复状态管理 | 仅 `breadcrumb-context` / `theme-provider` 两个 Context，关注点不同 ✅ |
| 日志体系 | `console.*` 仅存于 `logger.ts` / `env.ts`，零残留 ✅ |
| 重复权限 | `hasRole` 已于前轮收敛 ✅ |
| 重复组件 | `ui/{badge,card,dialog,skeleton}.tsx` 为 SSOT；`user-avatar` 与 `safe-avatar` 互补（后者含 onError 降级），非重复 ✅ |

### 4. 类型安全
- 自动迁移初版引入 20+ 处 `data is possibly 'undefined'` 类型错误，第二遍自修正。
- 本回合手动修复 4 处遗留：`notifications-client`（nextCursor 可选属性）、`reset-password`（email 可选属性）、`curated-collections`（editing 可选属性 + 不存在的 `data.games`）、`admin-games-table` 重复 import。
- **最终 `tsc --noEmit` 对 `src/` 零错误** ✅

## Round 3（2026-07-21 续，深度扫描 + 富文本净化收敛）

### 自动迁移进程已收尾 — 请求层收敛完成
- 复扫确认：`admin/services/page.tsx` 等最后一批内部 JSON fetch 已全部由自动进程收敛到 `apiFetchSafe`/`api`。
- 当前残留 `fetch(` 全部为**正当例外**（非重复实现）：
  - 服务端外部 HTTP：resend / brevo / vndb / redis / sentry / translate 等上游客户端（不归应用内 `api-client` SSOT）。
  - FormData 上传：`/api/upload`、`/api/setup/upload`、`/api/admin/checkin-config/upload`（多部件表单必须裸 fetch）。
  - `card-generate-btn.tsx` 的 `fetch(src)`（外部资源 URL，非 `/api/*`）。
- **请求层收敛彻底完成；`tsc --noEmit` 对 `src/` 零错误**。

### 新发现并修复的真实重复：富文本净化（安全敏感）
- 问题：`components/game-detail/intro-tab.tsx` 内联 `DOMPurify.sanitize(html, SANITIZE_CONFIG)` + 自建 `SANITIZE_CONFIG` + `DescriptionContent` 组件，绕过了全站富文本渲染 SSOT（`rich-text-content.tsx` + `rich-text-content-wrapper.tsx`，已被 9 处使用）。
- 收敛动作：
  - 在 `lib/sanitize.ts` 新增 `sanitizeRichText(html)`，以含表格/尺寸属性的规范白名单作为**全站富文本净化唯一入口**。
  - `rich-text-content.tsx` 改用 `sanitizeRichText`，并新增可选 `className` 参数。
  - `intro-tab.tsx` 删除内联 `DOMPurify` import、`SANITIZE_CONFIG`、`DescriptionContent`，改用 `<RichTextContent className="prose dark:prose-invert ..." />` —— 保留原 `prose` 排版，**零视觉回归**。
- 现全项目 `DOMPurify.sanitize` 仅存在于 `lib/sanitize.ts` SSOT（`stripHtml` / `sanitizeString` / `sanitizeRichText`）。

### 本轮深度扫描 — 已确认干净的类别（零重复）
| 类别 | 结论 |
|------|------|
| 富文本渲染 | 全部经 `RichTextContent` / `sanitizeRichText` SSOT；`intro-tab` 已收敛 ✅ |
| 重复权限 | 所有鉴权闸门走 `hasRole`；裸 `role ===` 仅为 UI 显示或 `services/admin.ts` 的 SUPER_ADMIN 变更守卫（即该逻辑 SSOT）✅ |
| 类名合并 | `cn()` 独占，无第二份 `clsx` / `twMerge` ✅ |
| 日志 | `console.*` 仅 `env.ts` / `logger.ts` ✅ |
| 相对时间 | `timeAgo` / `timeAgoPublished` SSOT，零内联"X 分钟前" ✅ |
| emoji | `EMOJI_LIST` / `COMMENT_EMOJI_GROUPS` 单一来源 ✅ |
| URL 校验 | `sanitizeUrl` 唯一入口；`new URL()` 均为框架/基础设施用途 ✅ |
| 角色色映射 | `ROLE_META`（账户角色）与 `ROLE_COLORS`（credits 创作职位）分域，非重复 ✅ |
| 状态徽章色簇 | 内联 `bg-emerald-500/10` 等为**样式使用**，非 Badge 组件第二实现；按定调不强行提取 ✅ |
| 数字格式化 | `formatNum` 仅 `card-generate-btn` 内用于 SVG 文本，无对应 SSOT；保留 |

### 验证
- `npx tsc --noEmit 2>&1 | grep "^src/"` → **空（零错误）** ✅
- `grep -rn "fetch(" src | grep "/api/"` → 仅余正当例外 ✅
- `grep -rn "DOMPurify.sanitize" src` → 仅 `lib/sanitize.ts` ✅

## 总体结论
经 Round 2 + Round 3 收敛，全项目在"已建 SSOT 的功能"上已不存在第二份实现；请求方式、HTML 净化、富文本净化、权限、类名、日志、相对时间、emoji、URL 校验、角色元数据均统一为单一来源。残留内联样式（状态色簇、年份提取）属使用层，无对应 SSOT，按定调不强行收敛。架构一致性收敛目标已达成。

## 待继续（可选 Follow-up，非阻塞）
- L5 品牌硬编码色 → CSS 变量（低优先级）。
- 状态徽章色簇（success/warning/destructive）逐步统一到 `<Badge variant>`（可选，属样式层统一）。

## 验证命令
```bash
# 类型检查（src 零错误）
npx tsc --noEmit 2>&1 | grep "^src/"

# 裸 fetch 残留（仅余正当例外 + 进程中待迁移项）
grep -rn "fetch(" src --include=*.ts --include=*.tsx | grep "/api/"
```
