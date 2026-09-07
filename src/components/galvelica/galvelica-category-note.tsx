"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * 同人分类说明：沿用主站 Tooltip（Radix portal 浮层），替代原生 title。
 * 仅供 /galvelica/works/<...> 详情页使用；文案与原 title 一致，不改写。
 */
const CATEGORY_DESC = {
  PURE: "纯正同人：个人或无注册社团自主制作，仅同人渠道分发",
  OTHER: "同人系公司：早年为同人社团、后期注册公司的厂商作品（同人衍生商业作）",
} as const

export function GalvelicaCategoryNote({ category }: { category: string }) {
  const isPure = category === "PURE"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="galvelica-detail-alt galvelica-detail-category" tabIndex={0}>
          {isPure ? "纯正同人" : "同人系公司商业作"}
        </p>
      </TooltipTrigger>
      <TooltipContent>{isPure ? CATEGORY_DESC.PURE : CATEGORY_DESC.OTHER}</TooltipContent>
    </Tooltip>
  )
}
