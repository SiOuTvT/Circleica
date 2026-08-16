# Prisma 7 迁移审计报告（B-1）

- 迁移类型：Prisma 6 → 7 底层依赖迁移（非架构重构）
- 报告日期：2026-08-17
- 结论：**CONDITIONAL GO（本机可验证项全 PASS；next build 受环境 safe-delete shim 阻断，需在干净会话由用户执行确认；数据库相关项待真实环境验证）**

---

## 一、升级前状态

- `prisma` / `@prisma/client`：`^6.2.0`
- `@prisma/instrumentation`：钉死 `^6.19.3`
- 无 `@prisma/adapter-pg`、`pg`、`dotenv`
- generator：`provider = "prisma-client-js"` + `engineType = "library"` + `binaryTargets`
- 客户端单例位于 `src/lib/prisma.ts`，内置离线 proxy（DATABASE_URL 缺失回退、连接参数、SELECT 1 探测、半开自愈、写操作拦截、优雅关闭）
- 42 处 `@prisma/client` 导入（src 29 + scripts 12，含 1 个测试文件）
- 11 个脚本直接 `new PrismaClient()`（与其余 25 个脚本复用 `@/lib/prisma` 的单例不一致）

---

## 二、Prisma 7 breaking changes 与本项目命中项

| Breaking change | 是否命中 | 处理方式 |
| --- | --- | --- |
| 强制使用驱动适配器（driver adapters） | 命中 | 新增 `@prisma/adapter-pg` + `pg`，`prisma.ts` 改用 `new PrismaPg({...})` |
| generator `prisma-client-js` 弃用，改用 `prisma-client` + 必填 `output` | 命中 | schema 改为 `provider = "prisma-client"` + `output = "../src/generated/prisma"` |
| 删除 `engineType` / `binaryTargets` | 命中 | 已删除 |
| CLI 默认不读 `.env`，配置中心化到 `prisma.config.ts` | 命中 | 新建 `prisma.config.ts`（`defineConfig` + `env`） |
| `migrate dev` 不再自动 seed，seed 迁至 config | 命中 | `prisma.config.ts` 的 `migrations.seed` |
| 不再从 `@prisma/client` 导出，改从生成 client 导入 | 命中 | 42 处导入改写为 `@/generated/prisma/client` |
| `@prisma/instrumentation` `PrismaInstrumentation` 是否保留 | 未破坏性 | 7.9.1 仍导出 `PrismaInstrumentation`，`otel-node.ts` 无需改动 |
| mapped-enum bug（v7.2 #28591） | 未命中 | schema 8 个 enum 无任何值使用 `@map`，不适用 |
| Next.js `serverExternalPackages` 需改 | 未命中 | v7 无 Rust 引擎，无需改 `next.config.ts` |

依赖版本组合（均解析自 npm registry 当前稳定版，未引入 Prisma 8 / canary / beta）：
- `prisma` = 7.9.1（精确锁版本）
- `@prisma/client` = 7.9.1
- `@prisma/instrumentation` = 7.9.1
- `@prisma/adapter-pg` = 7.9.1
- `pg` = ^8.16.3（adapter-pg 自带 peer `^8.16.3`，实装 8.23.0）
- `@types/pg` = ^8.16.0（devDep，实装 8.21.0）
- `dotenv` = ^16.4.7（devDep，实装 16.6.1）

---

## 三、实际修改文件清单

### 修改
1. `package.json` — 升级 4 个 Prisma 包至 7.9.1，新增 `@prisma/adapter-pg`/`pg`/`dotenv`，devDeps 新增 `@types/pg`
2. `prisma/schema.prisma` — generator 改为 `prisma-client` + `output`；删除 `engineType`/`binaryTargets`；`datasource` 删除 `url`（迁至 config）
3. `prisma.config.ts`（新建）— `schema` / `datasource.url = env("DATABASE_URL")` / `migrations.seed`
4. `src/lib/prisma.ts` — 导入改为 `@/generated/prisma/client` + `PrismaPg`；`createPrismaClient` 改用 adapter；**原样保留**离线 proxy、占位 URL 回退、`addConnectionParams`、`connect_timeout` 等连接参数、连接池/生命周期、`$queryRaw SELECT 1` 探测、半开自愈、写拦截、优雅关闭、`export { Prisma }`；新增 `buildSslConfig()`（仅由 `DATABASE_SSL` / `DATABASE_SSL_CA` 环境变量驱动，禁止硬编码证书/密码/连接参数）
5. 42 处 `@prisma/client` 导入改写（src 29 + scripts 12）→ `@/generated/prisma/client`（scripts 用相对路径 `../src/generated/prisma/client` for type-only；11 个脚本改为 `import { realPrisma as prisma } from "@/lib/prisma"`）
6. 11 个脚本中 `const prisma = new PrismaClient()` 删除，统一走 `@/lib/prisma` 的 `realPrisma`（消除重复 adapter/连接池初始化，单一创建入口）
7. `jest.setup.ts` — Tier-2 最小 mock（见第五节）

### 未改动（按硬性约束）
- `prisma/migrations/` 全部 29 个历史迁移
- `Dockerfile` / `docker-compose*.yml` / `ci.yml`
- `migrate-entrypoint.sh`（seed 命令不变）
- 业务查询 / Repository / Service 逻辑（仅改导入路径与 adapter 注入点）
- `otel-node.ts`（API 未变）
- 未触及 TypeScript 7 / Tiptap / Recharts / Uploadthing / any 清理 / PG 迁移 / dot-files

---

## 四、验证门禁结果（按 B-1 第 10 条）

| 门禁项 | 结果 | 说明 |
| --- | --- | --- |
| `npm install` | PASS | 7.9.1 全装好，无冲突 |
| `prisma generate` | PASS | 生成至 `src/generated/prisma`（7.9.1） |
| `prisma validate` | PASS | schema 合法 |
| `tsc --noEmit` | PASS | 0 errors（实证 42 处导入合法 + `Prisma.sql`/`Prisma.join`/`Prisma.JsonNull`/`PrismaClientKnownRequestError`/`PrismaClient` 生成 client 均存在且被正确使用） |
| `npm run lint` | PASS | 0 errors / 104 warnings（warnings 为已知 `any` + `no-img-element` 历史项，属独立清理队列，非 B-1 引入） |
| `npm test`（jest） | PASS | 325 / 325，30 套件全过 |
| `next build` | 环境阻断 | 见第五节 / 第六节 |
| Prisma 命名空间 API 实测 | PASS | 见第四节附录 |
| `PrismaInstrumentation` 导出实测 | PASS | 7.9.1 仍导出，otel 无需改动 |

### 本机已真实验证 PASS
npm install、prisma generate、prisma validate、tsc --noEmit、lint（0 error）、jest 325/325、Prisma 命名空间 API、PrismaInstrumentation 导出。

### 当前环境无法验证
- `next build`：被 **safe-delete 防护 shim** 阻断。build 启动清理 `.next`（约 5708 文件）触发批量删除阈值（50）被拦截；build 在加载 `next.config.ts` 并进入 webpack 阶段后、编译开始前被清理步骤阻断，**未发生任何配置/导入解析错误**。该 shim 为环境工具约束，按用户硬性要求不绕过/不关闭（与历史 pass4 同方式，pass4 在干净会话曾成功产出 Compiled successfully）。需在干净会话由用户执行 `npm run build` 确认。

### 需要服务器（真实环境）验证
- `prisma migrate status` / `prisma migrate deploy`（测试库）
- PG17 真实连接 + CRUD 冒烟
- 认证/权限数据访问冒烟
- OTel Collector 真实上报
- 生产 SSL（`DATABASE_SSL_CA`）真实连通
- 生产数据库冒烟

以上一律禁止伪造 PASS，标记为「待真实环境验证」。

### 附录：Prisma 命名空间 API 实测证据
- `src/generated/prisma/internal/prismaNamespace.ts:32` `export const PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError`
- `:50` `export const sql = runtime.sqltag`
- `:52` `export const join = runtime.join`
- `JsonNull` 为标准导出；`tsc --noEmit` 0 错误交叉确认 app 对这些符号的使用全部合法。

---

## 五、Jest 策略（Tier 1 → Tier 2）

### Tier 1（局部 transform）结论：不可行
Prisma 7 生成的 `client.ts` 使用 `import.meta.url`（`globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))`），属 ESM-only 语法。CJS 的 Jest 运行时报 `SyntaxError: Cannot use 'import.meta' outside a module`。

尝试局部 ESM 化（仅 generated client 标 `extensionsToTreatAsEsm` + `useESM`）会因 `prisma.ts`（CJS）导入该 ESM client 而级联要求 `prisma.ts` 也转 ESM，进而要求所有消费者转 ESM → 实质为**全局 Jest ESM 化（Tier 3）**。按约定，Tier 3 须暂停汇报、不得擅自将全项目转 ESM。故 Tier 1 不可行。

### Tier 2（最小 mock，忠实复刻离线语义）—— 已采用
在 `jest.setup.ts` 中以 `jest.mock("@/lib/prisma")` 与 `jest.mock("@/generated/prisma/client", { virtual: true })` 替换底层 client：
- 复刻 `prisma.ts` 离线 proxy 语义：读操作（findMany/count/findUnique/aggregate/groupBy…）返回空；写操作（create/update/delete/upsert…）抛 `ServiceUnavailableError`；`$queryRaw`/`$executeRaw`（离线）抛 `ServiceUnavailableError`；`$transaction` 数组按读返回空、函数透传执行。
- `Prisma` 命名空间提供源码/测试实际用到的运行时成员：`PrismaClientKnownRequestError`、`PrismaClientValidationError`、`sql`、`join`、`JsonNull`。
- 未伪造任何「数据库可用」时的成功结果；业务代码本身未被替换，仅其底层 DB 调用在离线模式下返回空/抛错，与迁移前一致。未删除/降低任何测试。

### 验证
`npm test` → **325 / 325 通过**（30 套件），与原基线一致。

---

## 六、Prisma 7 实际迁移影响

- 客户端生成物形态变化：由 node_modules 内的 `prisma-client-js` 引擎，改为项目内 `src/generated/prisma` 的 TypeScript 源码 client（已被 `.gitignore` 忽略，随 `prisma generate` 重新生成）。
- 连接管理：由 Prisma 内置 Rust 引擎的连接池，改为 `pg` Pool（经 `PrismaPg` 适配）。原 `connection_limit`/`pool_timeout`/`connect_timeout` 语义映射到 pg 的 `max`/`idleTimeoutMillis`/`connectionTimeoutMillis`；URL 上的连接参数保留（`addConnectionParams` 不动），同时显式传入 pg 选项以确保连接池行为不变。
- SSL：`PrismaPg` 不再从连接串读 sslmode，改由 `buildSslConfig()` 按环境变量注入（与原有离线 proxy 行为解耦，更明确）。
- 性能/打包：`next build` 需打包 ESM 生成的 client（使用 `import.meta.url`），本环境因 shim 未跑通，需干净会话确认。
- 运行时兼容：业务数据访问层 API 形态不变（仍为 `prisma.model.method()`），故 Repository/Service 无需改动。

---

## 七、是否具备进入 B-2 TypeScript 7 的条件

**暂不具备，需先关闭两项再评估：**
1. `next build` 必须在干净会话由用户跑通（确认 ESM 生成 client 可被 Next 16 正常打包，无打包/SSR 报错）。
2. 真实环境数据库相关项（migrate deploy / PG17 CRUD / 认证数据访问 / OTel / 生产 SSL）需执行并验证。

在以上两项确认 PASS 后，B-1 才算完全闭环，届时再按既定流程进入 **B-2 TypeScript 7**（独立批次，不在本批次范围，符合第 13 条边界约束）。

---

## 八、遗留 / 后续注意

- `src/generated/prisma` 已 gitignore，CI/部署需保证 `prisma generate` 在 build 前执行（当前 `package.json` 的 `build` 脚本若未含 `prisma generate`，需在部署流程补一步；本批次未改 build 脚本，标记为待确认项）。
- 104 个 lint warnings（`any` / `no-img-element`）属已知独立清理队列，不在 B-1 范围。
- 11 个脚本改用 `realPrisma`（硬失败语义，无离线回退），与既有 25 个脚本复用 `prisma`（带离线 proxy）并存；二者均来自同一创建入口，符合统一入口约束。
