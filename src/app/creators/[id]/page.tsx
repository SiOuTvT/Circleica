import { RefreshCreatorBtn } from "@/components/refresh-creator-btn"
import { TranslatableDescription } from "@/components/translatable-description"
import { prisma } from "@/lib/prisma"
import { vndbClient } from "@/lib/vndb"
import { Database, ExternalLink, Globe } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

const ROLE_LABEL: Record<string, string> = {
  scenario:   "脚本",
  art:        "原画",
  chardesign: "角色设计",
  director:   "导演",
  music:      "音乐",
  songs:      "主题曲",
  staff:      "制作人员",
  scenario_art: "脚本·原画",
  translator: "翻译",
  editor:     "编辑",
  qa:         "测试",
  hgame:      "成人游戏",
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (id.startsWith("vndb-")) {
    const vndbId = id.replace("vndb-", "")
    const producer = await vndbClient.getProducer(vndbId)
    return { title: producer ? `${producer.original || producer.name} · 同人游戏站` : "创作者" }
  }

  const c = await prisma.creator.findUnique({ where: { id }, select: { name: true, nameJa: true } })
  return { title: c ? `${c.nameJa || c.name} · 同人游戏站` : "创作者" }
}

export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // VNDB 创作者：优先尝试 staff（个人创作者），降级到 producer（社团/公司）
  if (id.startsWith("vndb-")) {
    const vndbId = id.replace("vndb-", "")
    
    // 先尝试获取 staff 详情（个人创作者，有明确角色）
    const staff = await vndbClient.getStaffDetail(vndbId)
    
    if (staff && staff.vns.length > 0) {
      // 按角色分组作品
      const vnsByRole: Record<string, typeof staff.vns> = {}
      for (const vn of staff.vns) {
        const roleKey = vn.role || "other"
        if (!vnsByRole[roleKey]) vnsByRole[roleKey] = []
        vnsByRole[roleKey].push(vn)
      }
      const roleKeys = Object.keys(vnsByRole).sort((a, b) => vnsByRole[b].length - vnsByRole[a].length)

      return (
        <div>
          {/* Hero */}
          <div className="mb-8 flex items-start gap-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 light:from-white light:via-white light:to-zinc-50 p-8 ring-1 ring-white/[0.08] light:ring-black/[0.08] shadow-xl">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-bold text-white ring-2 ring-white/10 light:ring-black/10 shadow-lg">
              {(staff.original || staff.name)[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-3 mb-3">
                <h1 className="text-3xl font-bold text-zinc-100 light:text-zinc-900">{staff.original || staff.name}</h1>
                {staff.original && staff.name !== staff.original && (
                  <span className="text-base text-zinc-500 light:text-zinc-400">{staff.name}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="rounded-full bg-zinc-800/80 light:bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08]">
                  个人创作者
                </span>
                {staff.roles.map(role => (
                  <span key={role} className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
                    {ROLE_LABEL[role] ?? role}
                  </span>
                ))}
                <span className="rounded-full bg-gradient-to-r from-blue-500/20 to-sky-500/20 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-500/30">
                  {staff.vns.length} 部作品
                </span>
              </div>

              {staff.description && (
                <TranslatableDescription text={staff.description} className="mb-4 line-clamp-5" />
              )}

              <div className="flex flex-wrap gap-2">
                <a href={`https://vndb.org/s${vndbId}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900">
                  <Database className="h-3.5 w-3.5" strokeWidth={2} />VNDB
                </a>
              </div>
            </div>
          </div>

          {/* 按角色分组的作品 */}
          {roleKeys.map(roleKey => {
            const vns = vnsByRole[roleKey]
            const roleLabel = ROLE_LABEL[roleKey] ?? roleKey
            return (
              <section key={roleKey} className="mb-8">
                <h2 className="mb-5 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
                  <span className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-400" />
                  {roleLabel}
                  <span className="ml-2 text-xs font-normal text-zinc-500 light:text-zinc-400">共 {vns.length} 部</span>
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {vns.map(vn => (
                    <a key={vn.id} href={`https://vndb.org/${vn.id}`} target="_blank" rel="noopener noreferrer"
                      className="group overflow-hidden rounded-xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:-translate-y-1.5 hover:ring-white/[0.14] light:hover:ring-black/[0.14] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] light:hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                      <div className="relative" style={{ aspectRatio: "3/4" }}>
                        {vn.image ? (
                          <Image src={vn.image} alt={vn.title} fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.08]"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-800 light:bg-zinc-100 text-zinc-600 text-xs">无封面</div>
                        )}
                        {vn.rating && vn.rating > 0 && (
                          <div className="absolute top-2 right-2 rounded-lg bg-zinc-950/80 backdrop-blur-sm px-2 py-1 flex items-center gap-1">
                            <span className="text-amber-400 text-[11px]">⭐</span>
                            <span className="text-[12px] font-bold text-white">{(vn.rating / 10).toFixed(1)}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent light:from-white/95 light:via-white/60 p-2.5">
                          <p className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-100 light:text-zinc-900">{vn.title}</p>
                          {vn.original && vn.original !== vn.title && (
                            <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-500 light:text-zinc-400">{vn.original}</p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}

          <RefreshCreatorBtn />
        </div>
      )
    }

    // 降级到 producer（社团/公司）
    const producer = await vndbClient.getProducer(vndbId)
    if (!producer) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-zinc-200 light:text-zinc-800 mb-2">创作者信息加载失败</p>
          <p className="text-sm text-zinc-500 light:text-zinc-400 mb-6">VNDB 数据暂时不可用，请稍后重试</p>
          <RefreshCreatorBtn />
        </div>
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const p = producer!

    return (
      <div>
        {/* Hero */}
        <div className="mb-8 flex items-start gap-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 light:from-white light:via-white light:to-zinc-50 p-8 ring-1 ring-white/[0.08] light:ring-black/[0.08] shadow-xl">
          {p.image?.url ? (
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 light:ring-black/10 shadow-lg">
              <Image src={p.image.url} alt={p.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-bold text-white ring-2 ring-white/10 light:ring-black/10 shadow-lg">
              {(p.original || p.name)[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-3 mb-3">
              <h1 className="text-3xl font-bold text-zinc-100 light:text-zinc-900">{p.original || p.name}</h1>
              {p.original && p.name !== p.original && (
                <span className="text-base text-zinc-500 light:text-zinc-400">{p.name}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-full bg-zinc-800/80 light:bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08]">
                {p.type === "individual" ? "个人创作者" : "社团/公司"}
              </span>
              {p.developed && p.developed.length > 0 && (
                <span className="rounded-full bg-gradient-to-r from-blue-500/20 to-sky-500/20 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-500/30">
                  {p.developed.length} 部作品
                </span>
              )}
            </div>

            {p.description && (
              <TranslatableDescription text={p.description} className="mb-4 line-clamp-5" />
            )}

            <div className="flex flex-wrap gap-2">
              <a href={`https://vndb.org/p${vndbId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900">
                <Database className="h-3.5 w-3.5" strokeWidth={2} />VNDB
              </a>
            </div>
          </div>
        </div>

        {/* 参与作品 */}
        {p.developed && p.developed.length > 0 ? (
          <section>
            <h2 className="mb-5 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
              参与作品
              <span className="ml-2 text-xs font-normal text-zinc-500 light:text-zinc-400">共 {p.developed.length} 部</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {p.developed.map((vn: { id: string; title: string; image?: { url: string }; rating?: number }) => (
                <a key={vn.id} href={`https://vndb.org/${vn.id}`} target="_blank" rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:-translate-y-1.5 hover:ring-white/[0.14] light:hover:ring-black/[0.14] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] light:hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                  <div className="relative" style={{ aspectRatio: "3/4" }}>
                    {vn.image?.url ? (
                      <Image src={vn.image.url} alt={vn.title} fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.08]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 light:bg-zinc-100 text-zinc-600 text-xs">无封面</div>
                    )}
                    {vn.rating && vn.rating > 0 && (
                      <div className="absolute top-2 right-2 rounded-lg bg-zinc-950/80 backdrop-blur-sm px-2 py-1 flex items-center gap-1">
                        <span className="text-amber-400 text-[11px]">⭐</span>
                        <span className="text-[12px] font-bold text-white">{(vn.rating / 10).toFixed(1)}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent light:from-white/95 light:via-white/60 p-2.5">
                      <p className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-100 light:text-zinc-900">{vn.title}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : (
          <div className="py-16 text-center rounded-2xl bg-zinc-900/50 light:bg-zinc-100 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
            <p className="text-sm text-zinc-600 light:text-zinc-400">暂无关联游戏</p>
            <p className="mt-2 text-xs text-zinc-700 light:text-zinc-300">该创作者可能还未添加作品</p>
          </div>
        )}

        <RefreshCreatorBtn />
      </div>
    )
  }

  // 本地数据库创作者
  const creator = await prisma.creator.findUnique({
    where: { id },
    include: {
      games: {
        include: {
          game: {
            select: {
              id: true, title: true, coverImage: true,
              status: true, isNsfw: true, isPublished: true,
            },
          },
        },
      },
    },
  })

  if (!creator) notFound()

  const publishedGames = creator.games.filter(g => g.game.isPublished)
  const uniqueGames = [...new Map(publishedGames.map(g => [g.game.id, g.game])).values()] as typeof publishedGames[number]["game"][]

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 flex items-start gap-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 light:from-white light:via-white light:to-zinc-50 p-8 ring-1 ring-white/[0.08] light:ring-black/[0.08] shadow-xl">
        {creator.avatar ? (
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 light:ring-black/10 shadow-lg">
            <Image src={creator.avatar} alt={creator.name} fill
              className="object-cover" />
          </div>
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-bold text-white ring-2 ring-white/10 light:ring-black/10 shadow-lg">
            {(creator.nameJa || creator.name)[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <h1 className="text-3xl font-bold text-zinc-100 light:text-zinc-900">{creator.nameJa || creator.name}</h1>
            {creator.nameJa && creator.name !== creator.nameJa && (
              <span className="text-base text-zinc-500 light:text-zinc-400">{creator.name}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {([...new Set(publishedGames.map(g => g.role))] as string[]).map(role => (
              <span key={role} className="rounded-full bg-zinc-800/80 light:bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08]">
                {ROLE_LABEL[role] ?? role}
              </span>
            ))}
            <span className="rounded-full bg-gradient-to-r from-blue-500/20 to-sky-500/20 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-500/30">
              {uniqueGames.length} 部作品
            </span>
          </div>

          {creator.bio && (
            <TranslatableDescription text={creator.bio} className="mb-4 line-clamp-5" />
          )}

          <div className="flex flex-wrap gap-2">
            {creator.vndbId && (
              <a href={`https://vndb.org/p${creator.vndbId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900">
                <Database className="h-3.5 w-3.5" strokeWidth={2} />VNDB
              </a>
            )}
            {creator.twitterUrl && (
              <a href={creator.twitterUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-sky-500/20 hover:text-sky-400">
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />Twitter / X
              </a>
            )}
            {creator.wikipediaUrl && (
              <a href={creator.wikipediaUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900">
                <Globe className="h-3.5 w-3.5" strokeWidth={2} />Wikipedia
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 参与作品 */}
      {uniqueGames.length > 0 ? (
        <section>
          <h2 className="mb-5 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            参与作品
            <span className="ml-2 text-xs font-normal text-zinc-500 light:text-zinc-400">共 {uniqueGames.length} 部</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {uniqueGames.map(game => {
              const roles = publishedGames
                .filter(g => g.game.id === game.id)
                .map(g => ROLE_LABEL[g.role] ?? g.role)
              return (
                <Link key={game.id} href={`/games/${game.id}`}
                  className="group overflow-hidden rounded-xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:-translate-y-1.5 hover:ring-white/[0.14] light:hover:ring-black/[0.14] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] light:hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                  <div className="relative" style={{ aspectRatio: "3/4" }}>
                    {game.coverImage ? (
                      <Image src={game.coverImage} alt={game.title} fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.08]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 light:bg-zinc-100 text-zinc-600 text-xs">无封面</div>
                    )}
                    {game.isNsfw && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px]">
                        <span className="rounded border border-red-500/40 bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">R18</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent light:from-white/95 light:via-white/60 p-2.5">
                      <p className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-100 light:text-zinc-900">{game.title}</p>
                      <p className="mt-1 text-[10px] text-zinc-500 light:text-zinc-400">{roles.join(" · ")}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/50 light:bg-zinc-100 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
          <p className="text-sm text-zinc-600 light:text-zinc-400">暂无关联游戏</p>
          <p className="mt-2 text-xs text-zinc-700 light:text-zinc-300">该创作者可能还未添加作品</p>
        </div>
      )}

      <RefreshCreatorBtn />
    </div>
  )
}
