"use client"

import { useState } from "react"
import { TagCard } from "@/components/archive/tag-card"

type TagCardTag = React.ComponentProps<typeof TagCard>["tag"]

/** 整块默认只铺前 24 个（标签已由装配点按关联作品数倒序排好） */
export const TAGS_BLOCK_BUDGET = 24

/**
 * 「全部标签」网格（扁平列表，装配点已按关联作品数倒序）。
 * - <md：默认整块收起，只留「展开全部标签 (N)」按钮；展开后先铺前 24 个，再给「展开全部 (N)」铺满。
 * - ≥md：一律全量铺开、不截断、不出按钮。
 * 卡片本身（TagCard）与热区不动。
 */
export function TagGridList({
  tags,
  gridClass,
}: {
  tags: TagCardTag[]
  gridClass: string
}) {
  const [openBlock, setOpenBlock] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const total = tags.length

  return (
    <>
      {!openBlock && (
        <button
          type="button"
          onClick={() => setOpenBlock(true)}
          className="inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
        >
          展开全部标签 ({total})
        </button>
      )}

      <div className={openBlock ? "" : "hidden md:block"}>
        <div className={gridClass}>
          {tags.map((tag, i) => (
            <TagCard
              key={tag.id}
              tag={tag}
              showGroup={false}
              className={!showAll && i >= TAGS_BLOCK_BUDGET ? "hidden md:block" : undefined}
            />
          ))}
        </div>

        {total > TAGS_BLOCK_BUDGET && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
          >
            {showAll ? "收起" : `展开全部 (${total})`}
          </button>
        )}
      </div>
    </>
  )
}
