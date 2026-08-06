/**
 * scripts/restore-galvelica-data.ts
 * ---------------------------------------------------------------------------
 * 副站(Galvelica)数据恢复。
 *
 * 根因：此前 GALVELICA_KEEP_RAW=0 在生产环境运行，丢弃了 VNDB 原始载荷(raw)，
 * 导致 galvelica 的标签 / 创作者关系丢失：
 *   - Tag(source='galvelica') = 0
 *   - Creator(source='galvelica') = 0
 *   - WorkTag 约 1.4 万行成为孤儿（指向主站 Tag）
 *
 * 本脚本对全部 Work 重新融合：
 *   - 含非空 raw 的源（CnGal 807 条）：直接 fuseWork，从本地 raw 重建标签/创作者关系。
 *   - raw 为 null 但有适配器的源（VNDB 约 2 万条）：refetchSource 重新拉取后融合。
 *
 * 特性：断点续跑(TEMP 进度文件)、限流、单条失败不中断。非破坏性（只补关系，不改标量）。
 *
 * 用法：
 *   npx tsx scripts/restore-galvelica-data.ts                 # 全量（默认）
 *   npx tsx scripts/restore-galvelica-data.ts --only-fuse     # 仅本地融合（快，CnGal 等）
 *   npx tsx scripts/restore-galvelica-data.ts --only-vndb     # 仅 VNDB 重拉（慢，建议后台）
 *   npx tsx scripts/restore-galvelica-data.ts --check         # 连通性冒烟测试（1 条 VNDB）
 *
 * 环境变量：
 *   RESTORE_VNDB_DELAY_MS  两次 VNDB 重拉之间的间隔(ms)，默认 200
 */
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { fuseWork, refetchSource } from "@/lib/galvelica/work-service"
import { getAdapter } from "@/lib/galvelica/sources"
import type { SourceKey } from "@/lib/galvelica/sources/types"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const PROGRESS_PATH = join(tmpdir(), "restore-galvelica-progress.json")
const VNDB_DELAY_MS = Number(process.env.RESTORE_VNDB_DELAY_MS ?? 200)
const BATCH_LOG = 200

type Mode = "all" | "fuse" | "vndb" | "check"
const mode: Mode = process.argv.includes("--only-fuse")
  ? "fuse"
  : process.argv.includes("--only-vndb")
    ? "vndb"
    : process.argv.includes("--check")
      ? "check"
      : "all"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function loadProgress(): Set<string> {
  if (existsSync(PROGRESS_PATH)) {
    try {
      return new Set(JSON.parse(readFileSync(PROGRESS_PATH, "utf8")) as string[])
    } catch {
      /* ignore corrupt progress */
    }
  }
  return new Set()
}
function saveProgress(done: Set<string>): void {
  writeFileSync(PROGRESS_PATH, JSON.stringify([...done]))
}

async function checkConnectivity(): Promise<boolean> {
  const sample = await prisma.workSource.findFirst({
    where: { source: "VNDB", raw: { equals: Prisma.JsonNull } },
    select: { workId: true, externalId: true },
  })
  if (!sample) {
    console.log("[check] 无 VNDB 需重拉样本，跳过")
    return true
  }
  console.log(`[check] 测试 VNDB 重拉 workId=${sample.workId} externalId=${sample.externalId}`)
  const ok = await refetchSource(sample.workId, "VNDB")
  console.log(`[check] refetchSource 返回: ${ok}`)
  const tagCount = await prisma.workTag.count({ where: { workId: sample.workId } })
  const creatorCount = await prisma.workCreator.count({ where: { workId: sample.workId } })
  const rawBack = await prisma.workSource.findFirst({
    where: { workId: sample.workId, source: "VNDB" },
    select: { raw: true },
  })
  console.log(
    `[check] 该 Work 现有 WorkTag=${tagCount} WorkCreator=${creatorCount} raw已回填=${rawBack?.raw != null}`,
  )
  return ok
}

async function main(): Promise<void> {
  if (mode === "check") {
    const ok = await checkConnectivity()
    console.log(ok ? "[check] 连通性 OK" : "[check] 连通性失败（需检查 VNDB 代理 / token）")
    return
  }

  console.log(`[restore] 模式=${mode}  VNDB_DELAY=${VNDB_DELAY_MS}ms`)

  const all = await prisma.workSource.findMany({
    select: { workId: true, source: true, raw: true },
  })
  console.log(`[restore] 读取 WorkSource 共 ${all.length} 条`)

  const byWork = new Map<string, { source: string; raw: unknown }[]>()
  for (const s of all) {
    const arr = byWork.get(s.workId) ?? []
    arr.push({ source: s.source, raw: s.raw })
    byWork.set(s.workId, arr)
  }

  const done = loadProgress()
  const plan: { workId: string; nullRawSources: string[]; hasRaw: boolean }[] = []
  for (const [workId, sources] of byWork) {
    if (done.has(workId)) continue
    const nullRawSources = sources
      .filter((s) => s.raw == null && getAdapter(s.source as SourceKey) !== undefined)
      .map((s) => s.source)
    const hasRaw = sources.some((s) => s.raw != null)
    if (mode === "fuse" && !hasRaw && nullRawSources.length === 0) continue
    if (mode === "vndb" && nullRawSources.length === 0) continue
    if (mode === "all" && nullRawSources.length === 0 && !hasRaw) continue
    plan.push({ workId, nullRawSources, hasRaw })
  }
  console.log(`[restore] 待处理 Work 数=${plan.length}`)

  let processed = 0
  let refetched = 0
  let fused = 0
  let failed = 0
  const failedIds: string[] = []

  for (const item of plan) {
    const needsRefetch = item.nullRawSources.length > 0
    try {
      if (needsRefetch) {
        for (const src of item.nullRawSources) {
          const ok = await refetchSource(item.workId, src as SourceKey)
          if (!ok) {
            failed++
            failedIds.push(`${item.workId}:${src}`)
          } else {
            refetched++
          }
        }
      } else if (item.hasRaw) {
        await fuseWork(item.workId)
        fused++
      }
    } catch (e) {
      failed++
      failedIds.push(item.workId)
      if (failedIds.length <= 20) {
        console.error(`[restore] 失败 workId=${item.workId}:`, e instanceof Error ? e.message : e)
      }
    }
    done.add(item.workId)
    processed++
    if (needsRefetch) await sleep(VNDB_DELAY_MS)
    if (processed % BATCH_LOG === 0) {
      saveProgress(done)
      console.log(
        `[restore] 进度 ${processed}/${plan.length}  refetch=${refetched} fuse=${fused} 失败=${failed}`,
      )
    }
  }

  saveProgress(done)
  const tagG = await prisma.tag.count({ where: { source: "galvelica" } })
  const creatorG = await prisma.creator.count({ where: { source: "galvelica" } })
  const tagUsedByGalvelica = await prisma.tag.count({
    where: { works: { some: {} } },
  })
  const workTag = await prisma.workTag.count()
  const workCreator = await prisma.workCreator.count()
  console.log(`[restore] 完成。refetch=${refetched} fuse=${fused} 失败=${failed}`)
  console.log(
    `[restore] 汇总 Tag(source=galvelica)=${tagG}  Creator(source=galvelica)=${creatorG}  WorkTag=${workTag}  WorkCreator=${workCreator}`,
  )
  if (failedIds.length) {
    console.log(`[restore] 失败样本(前20): ${failedIds.slice(0, 20).join(",")}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
