import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { collectionService } from "@/services/user"
import { FolderHeart } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ListSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collection = await collectionService.getPublicByShareId(id)
  if (!collection) notFound()

  const games = (collection.favorites ?? []).map((f) => f.game)
  const owner = collection.user

  return (
    <LayoutWrapper>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FolderHeart className="h-5 w-5 text-primary/80" strokeWidth={2} />
            <span className="text-base font-semibold text-foreground">{collection.name}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">公开收藏夹</span>
          </div>
          {collection.description && (
            <p className="mb-3 text-sm text-muted-foreground">{collection.description}</p>
          )}
          {owner && (
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {owner.avatar ? (
                <Image src={owner.avatar} alt={owner.username} width={20} height={20} className="h-5 w-5 rounded-full object-cover" unoptimized />
              ) : null}
              <span>由 {owner.username} 收集</span>
            </p>
          )}
        </div>

        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderHeart className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">这个收藏夹还是空的</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 lg:gap-5 items-stretch [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
            {games.map((g) => (
              <Link key={g.id} href={`/games/${g.serialId ?? g.id}`} className="group">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
                  {g.coverImage ? (
                    <Image
                      src={g.coverImage}
                      alt={g.title}
                      width={200}
                      height={266}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FolderHeart className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-xs font-medium text-foreground transition-colors duration-200 group-hover:text-primary">{g.title}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </LayoutWrapper>
  )
}
