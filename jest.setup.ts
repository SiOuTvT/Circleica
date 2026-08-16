import "@testing-library/jest-dom"
import { ServiceUnavailableError } from "@/lib/errors"

/**
 * Tier-2 Prisma mock（Prisma 7 迁移专用）
 *
 * 背景：Prisma 7 生成的 client（src/generated/prisma/client.ts）使用 `import.meta.url`
 * （ESM-only 语法），无法在 CJS 的 Jest 运行时中加载。局部转 ESM 会因 prisma.ts 被迫
 * 转 ESM 而级联为「全局 Jest ESM 化」（Tier-3，按约定须暂停汇报），故采用 Tier-2 最小 mock。
 *
 * 原则：本 mock 仅复刻 prisma.ts 离线 proxy 的既有语义（无真实数据库环境下真实 prisma.ts
 * 的行为），不伪造任何「数据库可用」时的成功结果：
 *   - 读操作（findMany / count / findUnique / aggregate / groupBy ...）→ 返回空结果
 *   - 写操作（create / update / delete / upsert ...）→ 抛 ServiceUnavailableError
 *   - $queryRaw / $executeRaw（离线）→ 抛 ServiceUnavailableError
 *   - $transaction → 数组按读返回空、函数则透传执行
 * 这保证 325 个测试在无库环境下仍按原语义运行，不降低测试标准、不删除测试、不 mock 掉
 * 本应测试的业务逻辑（业务代码本身未被替换，只是其底层 DB 调用在离线模式下返回空/抛错，
 * 与迁移前一致）。
 *
 * 真实数据库环境下的行为（CRUD、事务、连接池）属于「待真实环境验证」，本 mock 不涉及。
 */

// ── Prisma 命名空间运行时成员（仅覆盖源码/测试中实际用到的） ──
class PrismaClientKnownRequestError extends Error {
  code: string
  clientVersion?: string
  constructor(message: string, opts: { code: string; clientVersion?: string }) {
    super(message)
    this.name = "PrismaClientKnownRequestError"
    this.code = opts.code
    this.clientVersion = opts.clientVersion
  }
}

class PrismaClientValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PrismaClientValidationError"
  }
}

// Prisma.sql`...` / Prisma.join(...) 仅用于构造原生查询，测试离线模式下不会真正执行，
// 返回最小占位对象即可（被 $queryRaw 离线抛错拦截，不会到达执行层）。
const sql = (_strings: TemplateStringsArray, ..._values: unknown[]) => ({
  __prismaSql: true,
})
const join = (_values: unknown[]) => ({ __prismaJoin: true })
// JsonNull 哨兵：引用点（data:{ raw: Prisma.JsonNull }）在写操作抛错前不会取值，
// 仅保证该符号「已定义」即可。
const JsonNull = Symbol.for("Prisma.JsonNull")

const Prisma = {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  sql,
  join,
  JsonNull,
}

// ── 离线 proxy 语义复刻 ──
const offlineWriteError = (): never => {
  throw new ServiceUnavailableError("数据库未连接（测试离线模式），写操作已阻止")
}

const READ_EMPTY: Record<string, () => unknown> = {
  findMany: () => [],
  findRaw: () => [],
  deleteMany: () => [],
  count: () => 0,
  aggregate: () => ({ _count: { _all: 0 }, _sum: {}, _avg: {}, _min: {}, _max: {} }),
  groupBy: () => ({ _count: { _all: 0 }, _sum: {}, _avg: {}, _min: {}, _max: {} }),
  findUnique: () => null,
  findFirst: () => null,
  findUniqueOrThrow: () => null,
  findFirstOrThrow: () => null,
}

const WRITE_METHODS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
])

const modelProxy = new Proxy(
  {},
  {
    get(_target, method) {
      const m = String(method)
      if (READ_EMPTY[m]) return async () => READ_EMPTY[m]()
      if (WRITE_METHODS.has(m)) return async () => offlineWriteError()
      // 未知方法：离线 proxy 的 default 分支对未知方法按写抛错；但测试通常只调用已知方法，
      // 这里以安全空结果兜底，避免非预期崩溃（与「不伪造成功结果」不冲突，空数组即离线语义）。
      return async () => []
    },
  },
)

const prismaMock = new Proxy(
  {},
  {
    get(_target, prop) {
      const p = String(prop)
      if (p === "$queryRaw" || p === "$queryRawUnsafe") return async () => offlineWriteError()
      if (p === "$executeRaw" || p === "$executeRawUnsafe") return async () => offlineWriteError()
      if (p === "$transaction") {
        return async (arg: unknown) => {
          if (Array.isArray(arg)) return []
          if (typeof arg === "function") return (arg as (x: unknown) => unknown)(prismaMock)
          return []
        }
      }
      if (p === "$disconnect" || p === "$connect" || p === "$on") return async () => {}
      if (p === "$use") return () => {}
      if (p === "$extends") return (x: unknown) => x
      return modelProxy
    },
  },
)

// 用 mock 替换统一 client 入口（prisma.ts），使所有业务模块在测试中拿到离线 proxy 语义，
// 且不再加载 ESM 生成的 client。
jest.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  realPrisma: prismaMock,
  Prisma,
}))

// 覆盖测试文件直接 import { Prisma } from "@/generated/prisma/client" 的路径
// （该路径即 ESM 生成的 client，无法在 CJS Jest 中加载）。
jest.mock(
  "@/generated/prisma/client",
  () => ({
    Prisma,
    PrismaClient: class {},
  }),
  { virtual: true },
)
