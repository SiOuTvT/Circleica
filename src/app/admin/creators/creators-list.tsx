"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { ExternalLink, User } from "lucide-react"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { CreatorDetailDialog } from "./creator-detail-dialog"

const CreatorDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.CreatorDeleteBtn })), {
  loading: () => <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />,
})

interface Creator {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  gender: string | null
  vndbId: string | null
  gameCount: number
}

export function CreatorsList({ creators }: { creators: Creator[] }) {
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)

  if (creators.length === 0) {
    return <EmptyState icon={User} title="暂无创作者" />
  }

  return (
    <>
    <AdminDataTable
      rows={creators}
      rowKey={(creator) => creator.id}
      emptyIcon={User}
      emptyTitle="暂无创作者"
      columns={[
        {
          key: "name",
          label: "创作者",
          render: (creator) => (
            <button
              type="button"
              onClick={() => setSelectedCreator(creator)}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                {creator.avatar ? (
                  <Image src={creator.avatar} alt={creator.name} width={36} height={36} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-400 text-xs font-bold text-white">
                    {creator.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="truncate font-medium text-foreground" title={creator.name}>{creator.name}</span>
            </button>
          ),
        },
        {
          key: "nameJa",
          label: "别名",
          width: "180px",
          render: (creator) => (
            <span className="block truncate text-xs text-muted-foreground" title={creator.nameJa ?? ""}>
              {creator.nameJa?.trim() || "—"}
            </span>
          ),
        },
        {
          key: "gender",
          label: "性别",
          width: "96px",
          render: (creator) => (
            <span className="text-xs text-muted-foreground">{creator.gender?.trim() || "—"}</span>
          ),
        },
        {
          key: "vndbId",
          label: "VNDB",
          width: "150px",
          render: (creator) =>
            creator.vndbId ? (
              <a
                href={`https://vndb.org/s${creator.vndbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {creator.vndbId}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
        },
        {
          key: "gameCount",
          label: "作品数",
          numeric: true,
          width: "96px",
          render: (creator) => creator.gameCount,
        },
      ]}
      actions={(creator) => (
        <span className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCreator(creator)}
            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition duration-150 ease-in-out hover:bg-accent hover:text-foreground"
          >
            查看
          </button>
          <CreatorDeleteBtn id={creator.id} gameCount={creator.gameCount} />
        </span>
      )}
      actionsWidth="132px"
    />

      <CreatorDetailDialog
        creator={selectedCreator}
        onClose={() => setSelectedCreator(null)}
      />
    </>
  )
}
