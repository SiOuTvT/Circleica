/**
 * 降权效果验证：用真实数据核对「不好看作品」（真人实拍/写实 3D、无封面）
 * 在推荐/随机场景中的出现概率是否真的被降低。
 *
 * 对应 src/lib/galvelica.ts 的逻辑：
 *   UNATTRACTIVE_SHARE = 0.15
 *   poolWhere(): 以 (1 - 0.15)=85% 概率走「好看池」，15% 概率走全池兜底
 *   → 不好看作品不是被过滤（仍可能被抽中），只是概率大幅降低
 *
 * 跑法：npx tsx scripts/verify-downrank.ts
 */
import { readFileSync } from "node:fs"

// 复用项目单例：Prisma 7 强制走 PrismaPg driver adapter，自行 new PrismaClient 会报错
import { prisma } from "../src/lib/prisma"

/** 直接从源码解析当前降权参数，避免脚本里的常量与 galvelica.ts 脱节 */
const UNATTRACTIVE_SHARE = Number(
  readFileSync(new URL("../src/lib/galvelica.ts", import.meta.url), "utf8").match(
    /const UNATTRACTIVE_SHARE = ([\d.]+)/,
  )?.[1] ?? NaN,
)
if (!Number.isFinite(UNATTRACTIVE_SHARE)) {
  throw new Error("未能从 src/lib/galvelica.ts 解析出 UNATTRACTIVE_SHARE")
}

const IS_UGLY = {
  OR: [{ contentFlags: { has: "LIVE_ACTION" } }, { coverImage: "" }],
}
const IS_ATTRACTIVE = {
  AND: [{ NOT: { contentFlags: { has: "LIVE_ACTION" } } }, { NOT: { coverImage: "" } }],
}

async function main() {
  const total = await prisma.work.count()
  const ugly = await prisma.work.count({ where: IS_UGLY })
  const good = await prisma.work.count({ where: IS_ATTRACTIVE })

  if (!total) {
    console.log("作品表为空，无法统计")
    return
  }

  const beforeRatio = (ugly / total) * 100
  // 降权后：只有那 15% 的全池抽样才有机会抽到不好看作品，且其中不好看占比仍为 ugly/total
  const afterRatio = UNATTRACTIVE_SHARE * beforeRatio
  const divisor = beforeRatio / afterRatio

  console.log("全库总数                 =", total)
  console.log("不好看（真人3D 或 无封面）= ", ugly, `(${beforeRatio.toFixed(2)}%)`)
  console.log("好看池（非真人 且 有封面）= ", good, `(${(100 - beforeRatio).toFixed(2)}%)`)
  console.log("---")
  console.log(
    "降权设置 UNATTRACTIVE_SHARE =",
    UNATTRACTIVE_SHARE,
    `（${((1 - UNATTRACTIVE_SHARE) * 100).toFixed(0)}% 走好看池，${(UNATTRACTIVE_SHARE * 100).toFixed(0)}% 全池兜底）`,
  )
  console.log("降权前：推荐里不好看的期望占比 =", beforeRatio.toFixed(2) + "%")
  console.log("降权后：推荐里不好看的期望占比 =", afterRatio.toFixed(2) + "%")
  console.log(
    "降低倍数 =",
    divisor.toFixed(2) + "x",
    `（即出现率降到约 1/${divisor.toFixed(1)}，且不为 0 —— 不好看作品仍有机会出现，符合「降权不是过滤」）`,
  )
  if (ugly === total) {
    console.log("\n⚠️ 好看池为空：所有作品都被判定为不好看，降权不会有效果，需检查判据")
  }
}

main()
  .catch((e) => {
    console.error("统计失败:", e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
