/**
 * 按优先级顺序把作品标题翻译成中文，走项目自带 /api/translate。
 *
 * 合规与限速：
 *  - 严格遵守接口自带限流 10 次/分钟，每次请求间隔 GAP_MS（默认 6600ms）。
 *  - 单线程串行，绝不并发；遇到 429 主动退避 60s。
 *  - 结果落盘 data/translate-cache.json，随时可中断，重跑自动续跑。
 *  - 按 data/rank-base.json 的排名先后推进：排名越靠前越先拿到中文名。
 *
 * 鉴权：用 NEXTAUTH_SECRET 现场签发一枚会话 JWT（Auth.js 标准 encode），
 *      仅用于本机 dev server 的批量离线任务，不改动任何项目代码与数据。
 *
 * 用法：node --env-file=.env --import tsx scripts/translate-titles.ts [最大条数] [名次上限]
 *   例：只翻精品 S+A（前 2092 名）→ node --env-file=.env --import tsx scripts/translate-titles.ts 0 2092
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { realPrisma as prisma } from "../src/lib/prisma.ts"
import { encode } from "next-auth/jwt"

const BASE = "http://localhost:3000"
const CACHE = "data/translate-cache.json"
const FAILS = "data/translate-fails.json"
const RANK_BASE = "data/rank-base.json"
const GAP_MS = 6600
const COOKIE_NAME = "circleica-session-token"

const MAX = Number(process.argv[2] ?? process.env.TRANSLATE_MAX ?? "0") // 0 = 不限
/** 名次上限：只翻排名 ≤ 该值的作品，用来优先啃精品区（如传 2092 覆盖 S+A） */
const MAX_RANK = Number(process.argv[3] ?? process.env.TRANSLATE_MAX_RANK ?? "0") // 0 = 不限
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function mintSession(): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("缺少 NEXTAUTH_SECRET")
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, email: true, emailVerified: true },
  })
  if (!user) throw new Error("库内没有用户，无法签发会话")
  console.log(`以用户「${user.username}」(${user.role}) 签发离线会话`)
  return encode({
    token: {
      id: user.id,
      sub: user.id,
      name: user.username,
      email: user.email,
      role: user.role,
      isEmailVerified: Boolean(user.emailVerified),
    },
    secret,
    salt: COOKIE_NAME,
    maxAge: 30 * 24 * 60 * 60,
  })
}

async function main() {
  if (!existsSync(RANK_BASE)) throw new Error("请先运行 build-priority-table.ts 生成待译清单")

  let cache: Record<string, string> = existsSync(CACHE)
    ? JSON.parse(readFileSync(CACHE, "utf8"))
    : {}
  const queue: { rank: number; text: string; lang: string }[] = JSON.parse(readFileSync(RANK_BASE, "utf8"))
  const scoped = MAX_RANK > 0 ? queue.filter((q) => q.rank <= MAX_RANK) : queue
  const todo = scoped.filter((q) => !cache[q.text])
  console.log(
    `待译 ${queue.length} 条${MAX_RANK > 0 ? `，名次 ≤ ${MAX_RANK} 的共 ${scoped.length} 条` : ""}，其中尚未翻译 ${todo.length} 条`,
  )
  if (!todo.length) return

  const jwt = await mintSession()
  const cookie = `${COOKIE_NAME}=${jwt}`

  const limit = MAX > 0 ? Math.min(MAX, todo.length) : todo.length
  console.log(`本次计划翻译 ${limit} 条，预计耗时 ${((limit * GAP_MS) / 60000).toFixed(1)} 分钟\n`)

  // 失败计数必须落盘：放在内存里的话每次运行都从 0 开始，
  // 「连续两次译不出就按原名收录」永远触发不了，那批条目会一直卡在待译。
  const failCount: Record<string, number> = existsSync(FAILS)
    ? JSON.parse(readFileSync(FAILS, "utf8"))
    : {}
  const saveFails = () => writeFileSync(FAILS, JSON.stringify(failCount))

  let ok = 0
  let fail = 0
  const t0 = Date.now()
  // 按「上一次请求发起时刻」计算间隔，而不是请求结束后再等，
  // 否则响应耗时会叠加进间隔，实测速率会从 9 条/分钟掉到 6.7 条/分钟。
  let nextAt = 0
  // 连续失败多半是第三方免费额度当天用尽了。这时继续按 6.6 秒重试纯属空转，
  // 既刷不到结果又白占限流配额，所以攒到阈值就长睡一觉再继续，好在无人值守下跨天跑。
  let consecutiveFail = 0
  const FAIL_PAUSE_THRESHOLD = 10
  const FAIL_PAUSE_MS = 60 * 60 * 1000

  /** 记一次失败，攒够阈值就长睡。返回 true 表示本轮已经睡过、可以继续。 */
  const noteFail = async (msg?: string) => {
    fail += 1
    consecutiveFail += 1
    if (msg) console.log(msg)
    if (consecutiveFail < FAIL_PAUSE_THRESHOLD) return
    console.log(
      `  连续失败 ${consecutiveFail} 次，多半是第三方免费额度当日耗尽或 dev server 掉线；长睡 ${FAIL_PAUSE_MS / 60000} 分钟再继续（无人值守跨天续跑）`,
    )
    writeFileSync(CACHE, JSON.stringify(cache, null, 0))
    saveFails()
    await sleep(FAIL_PAUSE_MS)
    consecutiveFail = 0
    // 睡醒后重新按间隔计时，也重新签一枚会话，避免过期 token 集体失败。
    nextAt = 0
  }

  for (let i = 0; i < limit; i++) {
    const item = todo[i]
    const wait = nextAt - Date.now()
    if (wait > 0) await sleep(wait)
    nextAt = Date.now() + GAP_MS
    try {
      const res = await fetch(BASE + "/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: BASE,
          Referer: BASE + "/",
        },
        body: JSON.stringify({ text: item.text.slice(0, 500), source: item.lang }),
      })
      if (res.status === 429) {
        console.log(`  [429] 触发限流，退避 60s（已翻 ${ok} 条）`)
        await sleep(60_000)
        i -= 1
        continue
      }
      // dev server 掉线或会话失效时接口会回 HTML 页面而不是 JSON，
      // 这里先按 content-type 挡一道，免得 json() 抛错后看不出真实原因。
      if (!(res.headers.get("content-type") ?? "").includes("json")) {
        await noteFail(`  #${item.rank} 接口返回非 JSON（HTTP ${res.status}），dev server 可能已掉线`)
        continue
      }
      const json = (await res.json()) as { data?: { translated?: string }; error?: string }
      const tr = json?.data?.translated?.trim()
      if (!tr) {
        await noteFail(json?.error ? `  #${item.rank} 接口报错: ${json.error}` : undefined)
      } else {
        const sameAsSource = tr === item.text.trim()
        // 英文标题里大量是专名/造词（Lucid9、Scarlet Hollow 这类），
        // 翻译引擎原样返回属于正确行为，必须接受，否则会白白耗掉整条队列。
        const asciiSource = /^[\x00-\x7F]*$/.test(item.text.trim())
        if (!sameAsSource || asciiSource) {
          cache[item.text] = tr
          ok += 1
          consecutiveFail = 0
        } else {
          // 日文等源语言译回原文，多半是真没翻出来，先留给下一轮重试；
          // 累计两次都译不出就按原名收录，避免卡在同一条上空转。
          const n = (failCount[item.text] ?? 0) + 1
          failCount[item.text] = n
          if (n >= 2) {
            cache[item.text] = tr
            delete failCount[item.text]
            ok += 1
            consecutiveFail = 0
          } else {
            // 接口有响应，只是这条没译出来，不算配额耗尽，别计入长睡。
            fail += 1
          }
          saveFails()
        }
      }
    } catch (e) {
      await noteFail(`  #${item.rank} 异常: ${(e as Error).message}`)
    }

    if ((i + 1) % 25 === 0) {
      const el = ((Date.now() - t0) / 60000).toFixed(1)
      const speed = (((i + 1) / (Date.now() - t0)) * 60000).toFixed(1)
      const left = (((limit - i - 1) * GAP_MS) / 60000).toFixed(0)
      console.log(
        `  已翻 ${ok} 条（失败 ${fail}），用时 ${el} 分钟，速率 ${speed} 条/分钟，剩余约 ${left} 分钟，最新 → ${cache[item.text] ?? "—"}`,
      )
      writeFileSync(CACHE, JSON.stringify(cache, null, 0))
    }
  }

  writeFileSync(CACHE, JSON.stringify(cache, null, 0))
  console.log(`\n本轮完成：成功 ${ok} 条，失败 ${fail} 条，缓存总计 ${Object.keys(cache).length} 条`)
  console.log("提示：重跑本脚本会继续翻译剩余条目；再跑一次 build-priority-table.ts 即可把新译名写进表格。")
}

main()
  .catch((e) => console.error("失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
