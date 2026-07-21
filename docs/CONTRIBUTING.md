# 贡献指南（Fangame）

> 面向：所有准备提交代码的贡献者。提交 PR 前请通读本文件。

## 分支与流程

1. 从 `main` 切功能分支：`feat/xxx`、`fix/xxx`、`chore/xxx`。
2. 本地自测通过（见下）后提 PR 到 `main`。
3. PR 需通过 CI（lint + 单测 + 构建）；文档类改动同样需通过链接/格式检查。

## 架构红线（违反将被打回）

- **Route 层**（`src/app/api/**/route.ts`）只做：解析请求 → 调 Service → 返回。禁止写业务逻辑、禁止裸 `try/catch`、禁止直接写 Prisma。
- **Service 层**（`src/services/**`）承载业务规则、输入校验、权限、抛 `AppError` 子类。
- **Repository 层**（`src/repositories/**`）只能是纯 Prisma 数据访问，无业务逻辑。
- **鉴权** 在 Service 层调用 `requireAuth()` / `requireAdminRole(...)`；新增管理接口必须显式加守卫。
- **统一异常**：路由用 `withHandler()` 包装，抛 `AppError` 或 `ZodError`，**不要**自己 `try/catch` 返回 500。
- **输入校验** 用 `@/lib/validations` 的 Zod schema；`parseBody()` / `parseSearchParams()` 会抛 `ZodError` 由 handler 自动转 422。
- **日志** 用 `@/lib/logger`，**严禁 `console.log`**。
- **存储** 经 `@/lib/storage` 的 `getStorage()`，勿直接调 R2/本地。
- **数据库** 改动走 Prisma Migration，提交迁移文件，不要在 Route 写 Prisma。
- **无死代码**：不要留 `TODO`/`FIXME` 或注释掉的废弃分支。

## 测试

```bash
npm run lint            # ESLint（next/core-web-vitals）
npm run test            # Jest 单元 / 逻辑
npm run test:e2e       # Playwright 端到端（需先 npm run dev 或 build）
```

- 新增 Service/工具函数请补 Jest 单测（参考 `src/lib/__tests__`、`src/**/__tests__`）。
- 关键用户路径建议补 Playwright e2e。
- 每次 PR **必须** 跑通 `lint` + `test`。

## 提交信息

约定式提交：`feat:` / `fix:` / `docs:` / `refactor:` / `chore:` + 简短中文/英文描述。

## 文档义务

代码与文档同 PR 交付：

- 新接口 → 在 [API 参考](API_REFERENCE.md) 补充路由与示例。
- 破坏性变更 → 在 PR 描述写明迁移步骤。
- 架构级改动 → 同步 [架构说明](ARCHITECTURE.md)。
- 新成员 onboarding 受影响 → 同步 [入门指南](GETTING_STARTED.md)。

## 安全自查（涉及鉴权/上传/外部输入时必做）

- 新增写接口是否需 `rate-limit`？
- 用户输入（标签名、显示名、跳转目标等）是否在导出/落库前做校验与转义？
- 代理后 `x-forwarded-proto` / `trustProxy` 假设是否成立？
