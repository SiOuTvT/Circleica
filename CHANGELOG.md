# 变更记录

本文件记录 Circleica 的关键变动。项目尚未打正式版本标签，以下按时间线记录已完成的实质性工作；日常改动以 git 提交为准。

## 部署前整备（2026-08）

- **性能**：逐页面复核公共与管理页面，确认 Server Component 为主、查询字段裁剪、分页、缓存、请求生命周期（AbortController）到位；修正 `game-card` 高频卡片的 `transition-all` 为精确过渡。无中/高危性能缺陷。
- **安全**：复核认证、CSRF、限流、权限、上传、SSRF、响应头、错误处理；`npm audit` 0 漏洞。记录两项产品级偏差（R2 公开/私有、CSP nonce/unsafe-inline），待决策。
- **数据**：对真实数据库只读核验，发现 3 个迁移未应用（`slug_not_null`、`worksource_unique`、`schema_consistency`），经 `prisma migrate deploy` 补齐；核验 slug 完整性、唯一约束、外键孤儿、计数器一致性、空值异常，全部 0 异常。
- **仓库整理**：清理根目录一次性诊断产物与截图（约 100MB 的 `audit_screenshots` 已删）；历史审计报告归档到 `archive/`；正式文档重写（架构 / 开发 / 部署 / 可观测 / 数据模型 / README / CONTRIBUTING / SECURITY）。
- **数据库迁移补齐**：slug 置 NOT NULL、WorkSource `(source, externalId)` 唯一索引、WorkSourceType 枚举补齐变体、Creator `(name, source)` 唯一约束。

## 更早的积累（详见 `archive/`）

代码库经历了多轮功能开发与审计整改，相关过程材料已归入 `archive/audit-docs/`，不占用仓库门面位置。

---

说明：本仓库此前未使用语义化版本标签。待首次正式发布时建立版本标签，本文件改为按版本记录。
