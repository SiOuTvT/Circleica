# 独立治理队列台账（不并入部署前整备 Scope）

- 建立日期：2026-08-16（部署前整备轮）
- 纪律：以下两项为独立大项，不与本轮业务整改混谈；单独排期、单独制定范围 / 风险 / 执行顺序。本轮**不执行**这些清理，仅在部署验收通过后由独立队列处理。
- 说明：本轮已完成的「临时文件 / 一次性诊断产物 / audit_screenshots 清理」属于整备 Scope，不在此队列。

---

## 队列 1：全站 `any` 类型清理（约 97 处警告）

- 当前 `npm run lint` 报 97 个 `@typescript-eslint/no-explicit-any` 警告（0 错误）。
- 主要为外部 API 响应建模（vndb / 各来源）、管理后台动态表单、部分高频组件 props 的动态类型。
- 风险：多为局部动态负载，改起来需要逐一定义联合类型，工作量大且有回归风险。
- 执行顺序建议（未来独立队列）：先固化外部 API 响应（用 Zod），再清管理后台动态表单，最后清高频组件。每改一处跑 `tsc` + `jest` 防回归。

---

## 队列 2：全站裸 `console` 清理（5 处，均合理保留）

| 位置 | 性质 | 是否清理 |
|------|------|----------|
| src/lib/logger.ts | logger 自身兜底输出 | 保留（基础设施必需） |
| src/proxy.ts | 访问日志输出 | 保留（可改为 logger.debug，可选优化） |
| src/app/credits/*/error.tsx（多处） | Next.js error boundary 强制 `console.error` | 保留（框架约定） |

结论：业务代码已无裸 console；残留均为 logger 基础设施与错误边界强制输出，属合理保留。

---

## 本轮已完成的清理（不计入治理队列）

- 根目录一次性诊断产物（audit_*.json/.txt/.log/.err、build_verify*、tsc_audit、eslint_report、start-prod.log、_audit_dev.log、_dev3.log、tmp_*.mjs/.sql、circleica_data.sql、circleica.tar.gz、nul）全部删除。
- `audit_screenshots/`（约 954 文件、约 100MB）已删除（0 引用）。
- 历史审计报告归档至 `archive/audit-docs/`；正式文档重写。

> 注：原台账中的 `sw-asset://` / `no-img-element` / D-1 反证内容属于 ScriptWeaver 项目，与 Circleica 无关，相关文档已移入 `archive/`，不列入 Circleica 治理队列。
