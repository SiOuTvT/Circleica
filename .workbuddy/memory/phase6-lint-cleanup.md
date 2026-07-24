# Phase 6 — ESLint Warning 清扫结果

## 规模
- **96 → 57  warnings（-39，-41%）**
- **0 errors**（tsc 与 eslint 均 0 error）

## 消除的 warning

### `no-explicit-any`（28 个消除）
| 文件 | 改动 |
|------|------|
| `src/lib/utils.ts` | `ReactElement<any>` → `ReactElement<Record<string, unknown>>` |
| `src/lib/prisma.ts`（20） | Proxy 全文件 `any` → `unknown` + Record/json casting；`$queryRaw as any` 移除；`getEmptyResult(): any` → `: unknown`；logger 第二参 `LogContext` 修正 |
| `src/repositories/game.ts`（2） | `$queryRaw<any[]>` → typed `RandomGameRow`；`createResource(data: any)` → union create input |
| `src/repositories/user.ts` | `where: any` → `Prisma.NotificationWhereInput` |
| `src/lib/galvelica.ts`（2） | `mapCard(g: any)` → `GalvelicaCardSource` 接口；`t: any` 删除 (infer)；nullable `?? ""` coercion |
| `src/services/user.ts`（2） | search 去掉 `Promise<[any[], number]>` + `as [any[], number]`，让 infer 透传 Game[] |

### misc（11 个消除）
| 类别 | 文件 |
|------|------|
| 删除 unused import/const | `manifest.ts` (BASE)、`collection-picker-dialog.tsx` (apiDelete)、`validations.test.ts` (forumCommentSchema) |
| 删除 dead var/function | `structured-editor.tsx` (toggleLayout块 + isSmallCardGrid/blockData)、`top-nav.tsx` (checkinMsg/checkinDupMsg + hook destructure) |
| useMemo 包裹 | `gallery-hero.tsx` (galleryImages → useMemo) |
| eslint-disable | `use-emotional-messages.ts` (keysKey 优化)、`setup-wizard.tsx` ×3 (user-upload img preview) |

## 保留的 warning（57）

### 54 `no-explicit-any`
全部在 UI 组件层（admin pages、forum、game-detail、tag-managers 等），来自 API fetch 响应的 loose `any[]`。解决需为每个组件定义 response interface → 独立的中风险工作。

### 3 misc（故意跳过）
- `tags-manager.tsx` `handleCreate` / `tag-groups-manager.tsx` `handleCreateGroup` — 死 handler 但去除会级联到 state var 新增 unused warning
- `post-detail-modal.tsx` exhaustive-deps — `post?.comments` 加 dep 有 array-identity loop 风险

## 关键风险规避
- safeParseJson`<T = any>` 恢复（改 unknown 导致 49 条 API route tsc 级联错误，JSON body parser 天然 any）
- prisma Proxy 转换全程验证 tsc 无错（核心离线回退逻辑不改行为）
- galvelica mapCard 类型化后验证 tsc 无错 + 各调用点兼容
