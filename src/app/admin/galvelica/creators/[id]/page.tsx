import Link from "next/link"
import { notFound } from "next/navigation"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminBackLink } from "@/components/admin/admin-back-link"
import { AdminSectionHeading } from "@/components/admin/admin-section-heading"
import { Layers, ExternalLink } from "lucide-react"
import { CreatorDetailClient } from "./creator-detail-client"

export const metadata = { title: "Galvelica 创作者详情 · 管理后台" }
export const dynamic = "force-dynamic"

export default async function GalvelicaCreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSiteAdmin("galvelica")
  const { id } = await params

  const creator = await prisma.creator.findFirst({
    where: { id, source: "galvelica" },
    select: {
      id: true,
      name: true,
      nameJa: true,
      avatar: true,
      bio: true,
      gender: true,
      twitterUrl: true,
      wikipediaUrl: true,
      works: {
        where: { work: { isCommercial: false } },
        select: {
          role: true,
          work: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { work: { updatedAt: "desc" } },
      },
    },
  })
  if (!creator) notFound()

  const works = creator.works.map((w) => ({
    id: w.work.id,
    title: w.work.title,
    slug: w.work.slug,
    role: w.role,
  }))

  return (
    <AdminPageContainer
      galvelica
      eyebrow="GALVELICA · CREATOR"
      title={creator.name}
      description={creator.nameJa || "Galvelica 副站创作者"}
      actions={
        <div className="flex items-center gap-2">
          <AdminBackLink href="/admin/galvelica/creators" label="返回" />
          <CreatorDetailClient
            creator={{
              id: creator.id,
              name: creator.name,
              nameJa: creator.nameJa,
              bio: creator.bio,
              gender: creator.gender,
              twitterUrl: creator.twitterUrl,
              wikipediaUrl: creator.wikipediaUrl,
            }}
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-muted ring-1 ring-border">
              {creator.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-muted-foreground">
                  {creator.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{creator.name}</p>
              {creator.nameJa && <p className="text-sm text-muted-foreground">{creator.nameJa}</p>}
            </div>
            {creator.gender && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{creator.gender}</span>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {creator.twitterUrl && (
                <a href={creator.twitterUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Twitter
                </a>
              )}
              {creator.wikipediaUrl && (
                <a href={creator.wikipediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Wikipedia
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <AdminSectionHeading galvelica icon={Layers}>关联作品（{works.length}）</AdminSectionHeading>
            {works.length === 0 ? (
              <p className="text-sm text-muted-foreground">该创作者暂无关联作品。</p>
            ) : (
              <ul className="divide-y divide-border">
                {works.map((w) => (
                  <li key={w.id} className="flex items-center justify-between py-2.5">
                    <Link href={`/galvelica/works/${w.slug}`} className="font-medium text-foreground hover:text-primary hover:underline">
                      {w.title}
                    </Link>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{w.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminPageContainer>
  )
}
