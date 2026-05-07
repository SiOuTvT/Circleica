import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "创作者 · 同人游戏站" }

const ROLE_LABEL: Record<string, string> = {
  scenario:   "脚本",
  art:        "原画",
  chardesign: "角色设计",
  director:   "导演",
  music:      "音乐",
  songs:      "主题曲",
}

const ROLE_FILTERS = ["全部", "脚本", "原画", "角色设计", "导演", "音乐", "主题曲"]

const ROLE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_LABEL).map(([k, v]) => [v, k])
)

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const sp         = await searchParams
  const activeRole = sp.role ?? "全部"
  const roleKey    = ROLE_REVERSE[activeRole]

  const creators = await prisma.creator.findMany({
    where: roleKey ? { games: { some: { role: roleKey } } } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      games: { select: { role: true }, distinct: ["role"] },
      _count: { select: { games: true } },
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">创作者</h1>
        <p className="mt-1 text-sm text-zinc-500">同人 Galgame 的脚本家、画师、音乐人</p>
      </div>

      {/* 职位筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {ROLE_FILTERS.map(role => (
          <Link key={role} href={role === "全部" ? "/creators" : `/creators?role=${encodeURIComponent(role)}`}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              activeRole === role
                ? "bg-zinc-700 text-zinc-100 ring-1 ring-zinc-600"
                : "bg-zinc-900 text-zinc-500 ring-1 ring-white/[0.06] hover:bg-zinc-800 hover:text-zinc-300",
            ].join(" ")}>
            {role}
          </Link>
        ))}
      </div>

      {/* 创作者网格 */}
      {creators.length === 0 ? (
        <p className="py-20 text-center text-sm text-zinc-600">暂无创作者</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {creators.map(c => {
            const roles = [...new Set(c.games.map(g => ROLE_LABEL[g.role] ?? g.role))]
            return (
              <Link key={c.id} href={`/creators/${c.id}`}
                className="group flex flex-col items-center gap-2.5 rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/[0.06] transition-all hover:-translate-y-1 hover:bg-zinc-800 hover:ring-white/10 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                {c.avatar ? (
                  <Image src={c.avatar} alt={c.name} width={64} height={64}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 transition-all group-hover:ring-white/20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-500 text-2xl font-bold text-white ring-2 ring-white/10">
                    {(c.nameJa || c.name)[0]}
                  </div>
                )}
                <div className="text-center min-w-0 w-full">
                  <p className="truncate text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {c.nameJa || c.name}
                  </p>
                  {c.nameJa && c.name !== c.nameJa && (
                    <p className="truncate text-[10px] text-zinc-600">{c.name}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    {roles.slice(0, 2).map(role => (
                      <span key={role} className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500 ring-1 ring-white/[0.04]">
                        {role}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600">{c._count.games} 部作品</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
