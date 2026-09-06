import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { PersonLink } from "@/components/archive/person-link"
import { getGameParticipants } from "@/lib/credits-works"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serialId: string }>
}): Promise<Metadata> {
  const { serialId } = await params
  const id = Number(serialId)
  if (!Number.isFinite(id)) {
    return { title: "作品未找到", robots: { index: false, follow: true } }
  }
  const data = await getGameParticipants(id)
  if (!data) {
    return { title: "作品未找到", robots: { index: false, follow: true } }
  }
  return {
    title: `《${data.title}》的参与者`,
    description: `浏览 Circleica 中作品《${data.title}》的参与创作者名单。`,
    openGraph: {
      title: `《${data.title}》的参与者 · Circleica`,
      description: `浏览 Circleica 中作品《${data.title}》的参与创作者名单。`,
      images: ["/opengraph-image"],
    },
    alternates: { canonical: `/credits/game/${serialId}` },
  }
}

export default async function GameParticipantsPage({
  params,
}: {
  params: Promise<{ serialId: string }>
}) {
  const { serialId } = await params
  const id = Number(serialId)
  if (!Number.isFinite(id)) notFound()

  const data = await getGameParticipants(id)
  if (!data) notFound()

  const metaLine = data.releaseYear ? `${data.title}，发行年份 ${data.releaseYear}` : data.title

  return (
    <ArchiveShell
      entity="creator"
      density="compact"
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/credits/creator"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            创作者图鉴
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="truncate text-foreground">{data.title}</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="org"
          eyebrow="作品参与者"
          title={`《${data.title}》的参与者`}
          cover={data.coverImage}
          fallbackInitial={data.title}
          detailSpec
          href={`/games/${data.serialId}`}
          meta={
            <p className="text-xs text-muted-foreground">{metaLine}</p>
          }
        />
      }
    >
      {data.total === 0 ? (
        <ArchivePlaceholder state="empty" entity="creator" />
      ) : (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-primary" />
            参与创作者
          </h2>
          <div className="flex flex-col gap-2">
            {data.crew.map((row) => (
              <div key={row.role} className="flex items-start gap-3">
                <span className="w-14 shrink-0 text-xs leading-5 text-muted-foreground">{row.label}</span>
                <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                  {row.members.map((m) =>
                    m.slug ? (
                      <PersonLink
                        key={m.id}
                        href={`/credits/creator/${encodeURIComponent(m.slug)}`}
                        className="whitespace-nowrap"
                      >
                        {m.nameJa || m.name}
                      </PersonLink>
                    ) : (
                      <span key={m.id} className="whitespace-nowrap text-foreground/80">
                        {m.nameJa || m.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </ArchiveShell>
  )
}
