/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Gamepad2 } from "lucide-react"
import { vndbClient } from "@/lib/vndb"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  let name = "创作者"
  try {
    const p = await vndbClient.getProducer(id)
    if (p) name = p.name
  } catch {
    /* ignore */
  }
  return {
    title: `创作者：${name} · Circleica`,
    description: `来自 VNDB 的创作者「${name}」与其开发作品。`,
  }
}

function resolveTypeLabel(type?: string): string {
  if (type === "company") return "社团 / 公司"
  if (type === "individual") return "个人"
  return type ?? ""
}

export default async function VndbCreatorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const producer = await vndbClient.getProducer(id)
  if (!producer) notFound()

  const vns = producer.developed ?? []
  const label = resolveTypeLabel(producer.type)

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-6 sm:px-4">
      <Link
        href="/credits"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回创作者
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        {producer.image?.url && (
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted">
            <img
              src={producer.image.url}
              alt={producer.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {producer.name}
          </h1>
          {producer.original && (
            <p className="mt-1 text-sm text-muted-foreground">{producer.original}</p>
          )}
          {label && (
            <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {label}
            </span>
          )}
          <div className="mt-3">
            <a
              href={`https://vndb.org/p/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:underline"
            >
              在 VNDB 查看 <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {producer.description && (
        <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {producer.description}
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Gamepad2 className="h-5 w-5" /> 开发作品（{vns.length}）
        </h2>
        {vns.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无收录的开发作品。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {vns.map((vn) => (
              <a
                key={vn.id}
                href={`https://vndb.org/v/${vn.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all hover:ring-foreground/10"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                  {vn.image?.url ? (
                    <img
                      src={vn.image.url}
                      alt={vn.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">
                      无封面
                    </div>
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-xs text-foreground">{vn.title}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
