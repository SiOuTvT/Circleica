/**
 * 商业作品连带数据清理（同人资料馆不变式：只收同人 VN）。
 *
 * 商业系列（Work.isCommercial=true，共 164 部）已从副站全部公开查询排除，
 * 但它们携带的标签/创作者仍残留在库中（WorkTag / WorkCreator 关联行、孤立 Tag / Creator）。
 * 本脚本：
 *   1. 预演打印待删数量（不删）；
 *   2. 删除全部商业作品的 WorkTag / WorkCreator 关联行；
 *   3. 删除因此无任何作品/游戏关联的孤立 Tag（无 GameTag 且无 WorkTag）与 Creator（无 GameCreator 且无 WorkCreator）；
 *   4. 清空 galvelica 相关 Redis 缓存（公共 + 后台），避免旧缓存继续带商业数据。
 *
 * 用法：tsx scripts/cleanup-commercial-tags.ts
 * 幂等：可重复执行（第二次关联行/孤立行数量为 0）。
 */
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"

async function main() {
  const commercialCount = await prisma.work.count({ where: { isCommercial: true } })
  console.log(`[cleanup-commercial] 商业作品数: ${commercialCount}`)

  // ── 1. 预演 ──
  const wtCount = await prisma.workTag.count({ where: { work: { isCommercial: true } } })
  const wcCount = await prisma.workCreator.count({ where: { work: { isCommercial: true } } })
  const orphanTags = await prisma.tag.findMany({
    where: { AND: [{ games: { none: {} } }, { works: { none: {} } }] },
    select: { id: true, name: true },
    take: 10000,
  })
  const orphanCreators = await prisma.creator.findMany({
    where: { AND: [{ games: { none: {} } }, { works: { none: {} } }] },
    select: { id: true, name: true },
    take: 10000,
  })
  console.log(`[cleanup-commercial] 预演 → WorkTag: ${wtCount} / WorkCreator: ${wcCount} / 孤立 Tag: ${orphanTags.length} / 孤立 Creator: ${orphanCreators.length}`)

  // ── 2. 删除商业作品的关联行 ──
  const delWt = await prisma.workTag.deleteMany({ where: { work: { isCommercial: true } } })
  const delWc = await prisma.workCreator.deleteMany({ where: { work: { isCommercial: true } } })
  console.log(`[cleanup-commercial] 已删 WorkTag: ${delWt.count} / WorkCreator: ${delWc.count}`)

  // ── 3. 删除孤立 Tag / Creator（级联清掉其剩余关联行） ──
  const delTags = await prisma.tag.deleteMany({
    where: { AND: [{ games: { none: {} } }, { works: { none: {} } }] },
  })
  const delCreators = await prisma.creator.deleteMany({
    where: { AND: [{ games: { none: {} } }, { works: { none: {} } }] },
  })
  console.log(`[cleanup-commercial] 已删孤立 Tag: ${delTags.count} / 孤立 Creator: ${delCreators.count}`)

  // ── 4. 清缓存 ──
  await Promise.all([
    cache.delByPrefix("circleica:galvelica").catch(() => {}),
    cache.delByPrefix("circleica:admin:galvelica").catch(() => {}),
  ])
  console.log("[cleanup-commercial] 已清 galvelica 公共/后台缓存 ✅")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[cleanup-commercial] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
