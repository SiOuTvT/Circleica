/** 全面探查副站作品数据分布：为优先级公式与梯队断点提供事实依据 */
import { prisma, realPrisma } from "../src/lib/prisma"

// 必须用 realPrisma：src/lib/prisma.ts 的代理会把未特殊处理的方法包装成"模型代理"
const q = async (sql: string) => realPrisma.$queryRawUnsafe(sql)

async function main() {
  // ── 1. qualityScore 分布（定梯队断点）─────────────────────────
  const qsPct = (await q(`
    SELECT percentile_cont(ARRAY[0.01,0.05,0.10,0.25,0.5,0.75,0.90,0.95,0.99])
           WITHIN GROUP (ORDER BY "qualityScore") AS p
    FROM "Work"`)) as any[]
  const p = qsPct[0].p
  console.log("=== qualityScore 百分位 ===")
  console.log(
    ["1%", "5%", "10%", "25%", "50%", "75%", "90%", "95%", "99%"]
      .map((k, i) => `${k}=${Number(p[i]).toFixed(1)}`)
      .join("  "),
  )

  const qsHist = (await q(`
    SELECT (FLOOR("qualityScore"/10)*10)::int AS bucket, count(*)::int AS n
    FROM "Work" GROUP BY bucket ORDER BY bucket`)) as any[]
  console.log("=== qualityScore 直方图（每10分一档）===")
  console.log(qsHist.map((r) => `${r.bucket}-${r.bucket + 9}: ${r.n}`).join("  "))

  // ── 2. rating 分布（有值的作品）──────────────────────────────
  const rtPct = (await q(`
    SELECT percentile_cont(ARRAY[0.25,0.5,0.75,0.9,0.95]) WITHIN GROUP (ORDER BY rating) AS p,
           count(*)::int AS n, avg(rating)::float AS avg, max(rating) AS max
    FROM "Work" WHERE rating IS NOT NULL`)) as any[]
  const r = rtPct[0]
  console.log("=== rating（VNDB）有值作品 ===")
  console.log(
    `n=${r.n}  avg=${Number(r.avg).toFixed(2)}  max=${r.max}  ` +
      ["25%", "50%", "75%", "90%", "95%"].map((k, i) => `${k}=${Number(r.p[i]).toFixed(2)}`).join("  "),
  )

  // ── 3. 构成比 ────────────────────────────────────────────────
  const comp = (await q(`
    SELECT
      count(*) FILTER (WHERE "isCommercial")::int AS commercial,
      count(*) FILTER (WHERE "isNsfw")::int AS nsfw,
      count(*) FILTER (WHERE "coverSexual"=2)::int AS cover_sexual_2,
      count(*) FILTER (WHERE "coverSexual"=0)::int AS cover_safe,
      count(*) FILTER (WHERE "coverSexual"=-1)::int AS cover_undecided,
      count(*) FILTER (WHERE "steamAppId"<>'')::int AS steam,
      count(*) FILTER (WHERE "officialUrl"<>'')::int AS official,
      count(*) FILTER (WHERE "releaseDate" IS NOT NULL)::int AS has_date,
      count(*) FILTER (WHERE "coverImage"<>'')::int AS has_cover,
      count(*) FILTER (WHERE "gameId" IS NOT NULL)::int AS linked_main,
      count(*)::int AS total
    FROM "Work"`)) as any[]
  const c = comp[0]
  const t = c.total
  console.log("=== 构成比 ===")
  console.log(
    `总=${t}  商业作=${((c.commercial / t) * 100).toFixed(1)}%  NSFW=${((c.nsfw / t) * 100).toFixed(1)}%  ` +
      `封面露骨2=${((c.cover_sexual_2 / t) * 100).toFixed(1)}%  封面安全0=${((c.cover_safe / t) * 100).toFixed(1)}%  未定=${((c.cover_undecided / t) * 100).toFixed(1)}%\n` +
      `Steam=${((c.steam / t) * 100).toFixed(1)}%  官方链接=${((c.official / t) * 100).toFixed(1)}%  有发行日=${((c.has_date / t) * 100).toFixed(1)}%  有封面=${((c.has_cover / t) * 100).toFixed(1)}%  已关联主站=${((c.linked_main / t) * 100).toFixed(1)}%`,
  )

  // ── 4. doujinCategory / status 构成 ──────────────────────────
  const dj = (await q(`
    SELECT COALESCE("doujinCategory"::text,'(null)') AS cat, count(*)::int AS n FROM "Work" GROUP BY cat ORDER BY n DESC`)) as any[]
  console.log("=== doujinCategory ===", dj.map((r) => `${r.cat}=${r.n}`).join("  "))

  const st = (await q(`
    SELECT COALESCE(NULLIF("status",""),'(空)') AS s, count(*)::int AS n FROM "Work" GROUP BY s ORDER BY n DESC LIMIT 8`)) as any[]
  console.log("=== status Top8 ===", st.map((r) => `${r.s}=${r.n}`).join("  "))

  // ── 5. duration 样例 & screenshots 数量分布 ──────────────────
  const dur = (await q(`
    SELECT duration, count(*)::int AS n FROM "Work" WHERE duration<>'' GROUP BY duration ORDER BY n DESC LIMIT 10`)) as any[]
  console.log("=== duration Top10 ===", dur.map((r) => `${r.duration}(${r.n})`).join("  "))

  const shots = (await q(`
    SELECT (jsonb_array_length(screenshots))::int AS n, count(*)::int AS c
    FROM "Work" GROUP BY n ORDER BY n LIMIT 15`)) as any[]
  console.log("=== 截图数量分布(前15档) ===", shots.map((r) => `${r.n}张:${r.c}`).join("  "))

  // ── 6. 社团集中度 ────────────────────────────────────────────
  const studios = (await q(`
    SELECT "studioName", count(*)::int AS n, avg("qualityScore")::float AS avg_qs,
           max("qualityScore")::int AS max_qs
    FROM "Work" WHERE "studioName"<>'' GROUP BY "studioName"
    HAVING count(*)>=10 ORDER BY n DESC LIMIT 25`)) as any[]
  console.log("=== Top25 社团（作品数≥10）===")
  studios.forEach((s) =>
    console.log(
      `  ${s.studioName.padEnd(28)} 作品${String(s.n).padStart(4)}  均分${Number(s.avg_qs).toFixed(1)}  最高${s.max_qs}`,
    ),
  )

  // ── 7. 主创集中度 ────────────────────────────────────────────
  const creators = (await q(`
    SELECT c.name, count(*)::int AS n, avg(w."qualityScore")::float AS avg_qs
    FROM "WorkCreator" wc JOIN "Creator" c ON c.id=wc."creatorId" JOIN "Work" w ON w.id=wc."workId"
    GROUP BY c.name HAVING count(*)>=8 ORDER BY n DESC LIMIT 25`)) as any[]
  console.log("=== Top25 主创（参与作品≥8）===")
  creators.forEach((s) =>
    console.log(`  ${s.name.padEnd(28)} 参与${String(s.n).padStart(4)}  作品均分${Number(s.avg_qs).toFixed(1)}`),
  )
}

main()
  .catch((e) => console.error("探查失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
