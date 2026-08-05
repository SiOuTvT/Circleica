/**
 * Galvelica 跨源融合去重（一次性迁移，可重复运行、幂等）。
 *
 * 背景：各数据源（VNDB / CnGal / ...）经 upsertWorkFromRaw 各建一个 Work，
 * 同一作品跨源时产生重复 Work（如 VNDB 的 "Fate/stay night" 与 CnGal 译名条目）。
 *
 * 策略（零网络、零数据丢失，不依赖已被 KEEP_RAW 清空的 raw）：
 *   1. 用「归一化匹配键（title/originalWork/englishName/别名） + 发售日兼容」跨源聚类（union-find）
 *   2. 每簇选主 Work（优先含 VNDB，其次源最多，其次字段最全）
 *   3. 把次要 Work 的 WorkSource 改挂主 Work；WorkTag/WorkCreator 平移；gameId 必要时重定向
 *   4. 标量字段按 FUSION_TABLE 优先级合并（权威优先、高质量优先），别名 union、简介取最长
 *   5. 删除次要 Work
 *
 * 用法：
 *   npx tsx scripts/dedup-cross-source.ts           # 默认 DRY-RUN（只报告，不改库）
 *   npx tsx scripts/dedup-cross-source.ts --apply   # 真正去重
 */
import { PrismaClient, type WorkSourceType } from "@prisma/client"
import { FUSION_TABLE, type FusedFields } from "@/lib/galvelica/fusion"
import {
  normalizeMatchKey,
  releaseDatesCompatible,
} from "@/lib/galvelica/work-service"
import type { NormalizedWork } from "@/lib/galvelica/sources/types"

/** 本脚本用局部键提取：阈值放宽到 >=2（含 2 字中文标题），短键在聚类时要求发售日精确同日以防误并。 */
function localCandidateKeys(n: NormalizedWork): string[] {
  const out = new Set<string>()
  const texts: (string | undefined)[] = [n.title, n.originalWork, n.englishName, ...(n.aliases ?? [])]
  for (const t of texts) {
    const k = normalizeMatchKey(t)
    if (k.length >= 2) out.add(k)
  }
  return [...out]
}

/** 发售日是否精确同日（用于短匹配键的强约束）。 */
function sameExactDate(a: Date | string | null | undefined, b: Date | string | null | undefined): boolean {
  const ka = a ? new Date(a).toISOString().slice(0, 10) : null
  const kb = b ? new Date(b).toISOString().slice(0, 10) : null
  return !!ka && !!kb && ka === kb
}

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface SrcRow {
  id: string
  source: string
  externalId: string
}
interface WorkRow {
  id: string
  title: string | null
  originalWork: string
  englishName: string
  aliases: string
  releaseDate: Date | null
  gameId: string | null
  sources: SrcRow[]
}

/* ── union-find ── */
class UF {
  parent = new Map<string, string>()
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let r = x
    while (this.parent.get(r) !== r) r = this.parent.get(r)!
    // 路径压缩
    let c = x
    while (this.parent.get(c) !== r) {
      const n = this.parent.get(c)!
      this.parent.set(c, r)
      c = n
    }
    return r
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function filledScore(w: WorkRow): number {
  let n = 0
  for (const v of [w.title, w.originalWork, w.englishName, w.aliases]) if ((v || "").trim()) n++
  if (w.releaseDate) n++
  if (w.sources.length) n += 2
  return n
}

function primaryScore(w: WorkRow): number {
  let s = 0
  if (w.sources.some((x) => x.source === "VNDB")) s += 1_000_000
  s += w.sources.length * 10_000
  s += filledScore(w) * 100
  return s
}

async function main() {
  console.log(`══════════════════════════════════════════════`)
  console.log(`  Galvelica 跨源去重 ${APPLY ? "(APPLY)" : "(DRY-RUN)"}`)
  console.log(`══════════════════════════════════════════════\n`)

  const works = await prisma.work.findMany({
    select: {
      id: true,
      title: true,
      originalWork: true,
      englishName: true,
      aliases: true,
      releaseDate: true,
      gameId: true,
      sources: { select: { id: true, source: true, externalId: true } },
    },
  })
  console.log(`加载 Work 总数：${works.length}`)

  const map = new Map<string, WorkRow>()
  for (const w of works) map.set(w.id, w as WorkRow)

  // 建倒排索引：匹配键 → workIds
  const index = new Map<string, string[]>()
  for (const w of works) {
    const n = w as unknown as { title: string | null; originalWork: string; englishName: string; aliases: string }
    const norm: { title?: string; originalWork?: string; englishName?: string; aliases?: string[] } = {
      title: n.title ?? undefined,
      originalWork: n.originalWork || undefined,
      englishName: n.englishName || undefined,
      aliases: (n.aliases || "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
    }
    for (const k of localCandidateKeys(norm)) {
      const arr = index.get(k) ?? []
      arr.push(w.id)
      index.set(k, arr)
    }
  }

  // union-find 聚类
  const uf = new UF()
  let pairChecked = 0
  for (const [key, ids] of index) {
    // 同键内两两判定（日期兼容 + 跨源）
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = map.get(ids[i])!
        const b = map.get(ids[j])!
        pairChecked++
        const sameSource = a.sources.some((s) => b.sources.some((t) => t.source === s.source))
        if (sameSource) continue // 同源不合并
        // 长键（>=3）用 ±1.5 月容差；短键（2 字）要求发售日精确同日，避免常见词误并
        const dateOk = key.length >= 3
          ? releaseDatesCompatible(a.releaseDate, b.releaseDate)
          : sameExactDate(a.releaseDate, b.releaseDate)
        if (!dateOk) continue
        uf.union(a.id, b.id)
      }
    }
  }
  console.log(`匹配键数：${index.size}，配对检查：${pairChecked}`)

  // 按根分组
  const groups = new Map<string, string[]>()
  for (const w of works) {
    const root = uf.find(w.id)
    const g = groups.get(root) ?? []
    g.push(w.id)
    groups.set(root, g)
  }

  const clusters = [...groups.values()].filter((g) => g.length > 1)
  console.log(`重复簇（size>1）：${clusters.length}`)
  let worksToRemove = 0
  for (const c of clusters) worksToRemove += c.length - 1
  console.log(`预计删除次要 Work：${worksToRemove}\n`)

  // 报告每个簇
  clusters.sort((x, y) => y.length - x.length)
  let shown = 0
  for (const c of clusters) {
    const members = c.map((id) => map.get(id)!)
    members.sort((a, b) => primaryScore(b) - primaryScore(a))
    const primary = members[0]
    const lines = members.map((m, i) => {
      const srcs = m.sources.map((s) => s.source).join("/") || "?"
      const date = m.releaseDate ? m.releaseDate.toISOString().slice(0, 10) : "?"
      const tag = i === 0 ? "★主" : "  次"
      return `    ${tag} [${srcs}] ${m.title || m.originalWork || "(无标题)"} | ${date}`
    })
    console.log(`簇#${shown + 1} (${members.length} 个):`)
    console.log(lines.join("\n"))
    shown++
    if (shown >= 40 && !APPLY && !process.argv.includes("--all")) {
      console.log(`    …（仅显示前 40 簇，共 ${clusters.length} 簇；加 --all 看全部）`)
      break
    }
  }

  if (!APPLY) {
    console.log(`\n══════════════════════════════════════════════`)
    console.log(` DRY-RUN 完成，未修改任何数据。加 --apply 执行。`)
    console.log(`══════════════════════════════════════════════`)
    await prisma.$disconnect()
    return
  }

  /* ── APPLY ── */
  console.log(`\n开始去重合并…`)
  let merged = 0
  let clusterIdx = 0
  for (const c of clusters) {
    clusterIdx++
    const members = c.map((id) => map.get(id)!).filter(Boolean)
    members.sort((a, b) => primaryScore(b) - primaryScore(a))
    const primary = members[0]
    try {
      // 先按 FUSION_TABLE 合并标量（次要 Work 仍在，含其已融合的封面/简介等），
      // 再平移源/标签/创作者关系并删除次要 Work —— 顺序反了会丢次要源的标量值。
      await combineScalars(primary.id, members)
      for (const sec of members.slice(1)) {
        await mergeInto(primary, sec)
      }
      merged++
    } catch (e) {
      console.warn(`  ⚠️ 簇#${clusterIdx} 合并失败：${e instanceof Error ? e.message : String(e)}`)
    }
    if (clusterIdx % 25 === 0) {
      console.log(`  已处理 ${clusterIdx}/${clusters.length} 簇`)
      await sleep(20)
    }
  }

  console.log(`\n合并完成：${merged} 簇。`)
  console.log(`══════════════════════════════════════════════`)
  await prisma.$disconnect()
}

async function mergeInto(primary: WorkRow, sec: WorkRow): Promise<void> {
  // 1) 移动 WorkSource（处理 @@unique([workId,source]) 冲突：主已有则删次要行）
  for (const src of sec.sources) {
    const exists = await prisma.workSource.findFirst({
      where: { workId: primary.id, source: src.source as WorkSourceType },
      select: { id: true },
    })
    if (exists) {
      await prisma.workSource.delete({ where: { id: src.id } })
    } else {
      await prisma.workSource.update({ where: { id: src.id }, data: { workId: primary.id } })
    }
  }

  // 2) 平移 WorkTag（去重）
  const secTags = await prisma.workTag.findMany({ where: { workId: sec.id }, select: { tagId: true } })
  for (const t of secTags) {
    await prisma.workTag.upsert({
      where: { workId_tagId: { workId: primary.id, tagId: t.tagId } },
      create: { workId: primary.id, tagId: t.tagId },
      update: {},
    })
  }
  await prisma.workTag.deleteMany({ where: { workId: sec.id } })

  // 3) 平移 WorkCreator（去重）
  const secCreators = await prisma.workCreator.findMany({
    where: { workId: sec.id },
    select: { creatorId: true, role: true },
  })
  for (const cr of secCreators) {
    await prisma.workCreator.upsert({
      where: {
        workId_creatorId_role: { workId: primary.id, creatorId: cr.creatorId, role: cr.role },
      },
      create: { workId: primary.id, creatorId: cr.creatorId, role: cr.role },
      update: {},
    })
  }
  await prisma.workCreator.deleteMany({ where: { workId: sec.id } })

  // 4) gameId 重定向（仅当主无、次有）
  if (sec.gameId && !primary.gameId) {
    await prisma.work.update({ where: { id: primary.id }, data: { gameId: sec.gameId } })
  }

  // 5) 删除次要 Work（级联清掉残留源/标签/创作者行）
  await prisma.work.delete({ where: { id: sec.id } })
}

async function combineScalars(primaryId: string, members: WorkRow[]): Promise<void> {
  const full = await prisma.work.findMany({
    where: { id: { in: members.map((m) => m.id) } },
    select: {
      id: true,
      title: true,
      originalWork: true,
      englishName: true,
      aliases: true,
      description: true,
      coverImage: true,
      releaseDate: true,
      studioName: true,
      officialUrl: true,
      steamAppId: true,
      sources: { select: { source: true } },
    },
  })
  const patch: Record<string, unknown> = {}
  const prov: Record<string, { source: string; manual: boolean }> = {}

  for (const field of Object.keys(FUSION_TABLE) as (keyof FusedFields)[]) {
    if (field === "aliases") {
      const set = new Set<string>()
      for (const f of full)
        for (const a of (f.aliases || "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean)) set.add(a)
      if (set.size) patch.aliases = [...set].join(", ")
      continue
    }
    if (field === "description") {
      let best = ""
      for (const f of full) if ((f.description || "").length > best.length) best = f.description || ""
      if (best) patch.description = best
      continue
    }
    // 标量：按 FUSION_TABLE 优先级取首个非空
    for (const prio of FUSION_TABLE[field]) {
      const w = full.find(
        (f) => f.sources.some((s) => s.source === prio) && String((f as any)[field] ?? "").trim() !== "",
      )
      if (w) {
        const val = (w as any)[field]
        patch[field] = val
        prov[field] = { source: prio, manual: false }
        break
      }
    }
  }

  await prisma.work.update({
    where: { id: primaryId },
    data: { ...patch, provenance: prov as any },
  })
}

main().catch(async (e) => {
  console.error("去重异常", e)
  await prisma.$disconnect()
  process.exit(1)
})
