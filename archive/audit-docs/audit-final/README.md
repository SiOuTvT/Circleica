# Circleica 全站终极审计 · 交付物索引

审计执行日期：2026-08-13
审计方式：Playwright 全站扫描（public/user/admin 三态 × desktop/laptop/tablet/tablet-ls/mobile/mobile-ls 六视口，共 582 次访问）+ 静态代码审查 + 实测探针
范围：只审计不改业务代码；测试数据用现成 seed/fixture，用后清理
环境：Next.js 16 App Router + Prisma 6 + Redis 缓存，dev server localhost:3000

## 八份交付物

| 编号 | 文件 | 内容 |
|---|---|---|
| 1 | 01_PAGE_INVENTORY.md | 完整页面清单：主站 / Galvelica / Admin / 动态路由 / 404 / 登录前后 / 弹窗与抽屉 |
| 2 | 02_PAGE_SCORES.md | 页面级评分表：每页 10 维打分（总分 100），含视觉修正后评分 |
| 3 | 03_ISSUE_REGISTER.md | 问题总表：P0-P4 分级，含位置 / 根因 / 复现 / 建议 |
| 4 | 04_SYSTEM_SCORES.md | 三套系统评分：主站 71 / Galvelica 82 / Admin 69 |
| 5 | 05_DEVICE_SCORES.md | 设备评分：Desktop 86 / Tablet 81 / Mobile 73 |
| 6 | 06_REMEDIATION_ROADMAP.md | P0-P4 整改路线图（S0-S4 五阶段） |
| 7 | 07_VISUAL_AUDIT.md | 视觉截图审查报告：30 张核心截图逐页分析 + P0/P1 截图铁证 + 5 项视觉新发现 + 评分修正 |
| 8 | 08_FINAL_ACCEPTANCE_TABLE.md | 最终验收与整改总表（主交付物）：覆盖矩阵 + 验收总表 + 上线门禁六问答 |
| 9 | **09_REMEDIATION_BASELINE.md** | **整改基线（数据域边界与收录链路准则）**：前两轮有效结论 + 用户产品铁律，后续整改唯一行为准则；含数据域实测、收录链路现状、P0-1/P0-2 正确方向、严禁推导 |

## 已确认问题速览（详见问题总表）

- P0 × 2：主站图鉴数据源错配（source 全为 galvelica）+ 图鉴详情查询误用 findUnique 非唯一字段；制作组 slug 全空致详情恒软 404
- P1 × 3：favoriteCount 与真实收藏不一致；Admin 游戏详情更新日志组件 JS 运行时崩溃；图鉴缺失页 200 软 404 无 noindex
- P2 × 6：sitemap 缺 Galvelica 动态作品；论坛侧栏关闭态视口残留 15px；无自托管字体；70 页面缺独立 error.tsx；移动端 touch target 40px；首页 LCP 懒加载
- P3 × 5：无 CI 工作流；权限清单双维护；img-proxy 重定向未复检；移动端 hover 依赖；动态路由缺 loading 边界
- P4 × 6：React script 渲染警告；site-settings 请求中止噪音；random 页 session 轮询噪音；Jest worker 泄漏；responsive-audit 未纳入 CI；软 404 合集路由

## 已完成视觉截图审查（新增交付物 7）

- 30 张核心截图逐页审查（public/admin × desktop/mobile/tablet 关键页面）
- P0 图鉴空态 vs Galvelica 数据丰满的**截图对比铁证**
- P1-2 Admin 游戏详情 mobile **整页崩溃截图铁证**（"出了问题"+"3 Issues" badge）
- 5 项视觉新发现：首页公告空洞、移动端预览图空白区等
- 10 页评分基于截图修正（Admin 游戏详情从 66 降到 60，Galvelica 系列上调）

## 仍需实测项（已标注【需实测】）
