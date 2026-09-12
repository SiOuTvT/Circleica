"use client"

import { useState } from "react"
import { TagCard } from "@/components/archive/tag-card"

type TagCardTag = React.ComponentProps<typeof TagCard>["tag"]

/**
 * 整块「全部标签」默认只铺前 24 个（跨字母累计）。
 * 之前按「每字母组前 12」截断对中文/日文标签无效——每桶只有 1-5 个，永远不触发。
 */
export const TAGS_BLOCK_BUDGET = 24

export interface AzTagGroupItem {
  /** 展示用字母（0-9 已转成 #） */
  letter: string
  tags: TagCardTag[]
  /** 该组首个标签在「整块」中的序号（跨字母累计，由装配点 page.tsx 算好传入） */
  startOffset: number
  anchorId: string
}

/**
 * 单个 A–Z 字母分组。自身不持有截断/收起状态——「整块收起」与「整块前 24」都由
 * AzTagGroupList 统一控制；本组件只按 startOffset + showAll 决定手机端每个标签是否隐藏
 * （≥md 一律全量铺开，不截断）。
 */
export function AzTagGroup({
  letter, tags, gridClass, anchorId, startOffset, showAll,
}: {
  letter: string
  tags: TagCardTag[]
  gridClass: string
  anchorId: string
  startOffset: number
  showAll: boolean
}) {
  // 整组都落在预算之外：手机端连同吸顶头一起隐藏
  const groupBeyondBudget = !showAll && startOffset >= TAGS_BLOCK_BUDGET

  return (
    <div id={anchorId} className={groupBeyondBudget ? "scroll-mt-20 hidden md:block" : "scroll-mt-20"}>
      <div className="mb-3 flex items-baseline gap-2 border-b border-border/50 pb-1.5">
        <span className="text-sm font-bold text-foreground">{letter}</span>
        <span className="text-xs text-muted-foreground/60">{tags.length} 个标签</span>
      </div>
      <div className={gridClass}>
        {tags.map((tag, i) => {
          const beyond = !showAll && startOffset + i >= TAGS_BLOCK_BUDGET
          return <TagCard key={tag.id} tag={tag} className={beyond ? "hidden md:block" : undefined} />
        })}
      </div>
    </div>
  )
}

/**
 * 「全部标签」整块装配（跨字母统一控制截断）。
 * - <md：默认整块收起，只留「展开全部标签 (N)」按钮；展开后跨字母累计只铺前 24 个，
 *   再给「展开全部 (N)」铺满。
 * - ≥md：一律全量铺开、不截断、不出按钮（保持现状）。
 */
export function AzTagGroupList({
  groups, gridClass, totalTags,
}: {
  groups: AzTagGroupItem[]
  gridClass: string
  totalTags: number
}) {
  const [openBlock, setOpenBlock] = useState(false)
  const [showAll, setShowAll] = useState(false)

  return (
    <>
      {!openBlock && (
        <button
          type="button"
          onClick={() => setOpenBlock(true)}
          className="mt-4 inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
        >
          展开全部标签 ({totalTags})
        </button>
      )}

      <div className={openBlock ? "mt-4 space-y-6" : "mt-4 space-y-6 hidden md:block"}>
        {groups.map((g) => (
          <AzTagGroup
            key={g.anchorId}
            letter={g.letter}
            tags={g.tags}
            gridClass={gridClass}
            anchorId={g.anchorId}
            startOffset={g.startOffset}
            showAll={showAll}
          />
        ))}

        {totalTags > TAGS_BLOCK_BUDGET && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
          >
            {showAll ? "收起" : `展开全部 (${totalTags})`}
          </button>
        )}
      </div>
    </>
  )
}
