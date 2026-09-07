"use client"

import { useEffect, useState } from "react"

/**
 * 站点级加载骨架（作品库/首页共用）。
 * 画成「区块标题占位 + 细线 + 双列条目形占位」，与新版双列条目页面对齐，
 * 切回首页时不再从五列卡片网格跳到两列条目（避免抖一下）。
 * 列表页（作品库仍是旧卡片网格）加载瞬间会先看到条目形骨架，批 2 改成双列条目后即完全吻合。
 */
export default function GalvelicaLoading() {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)")
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const count = narrow ? 5 : 8

  return (
    <div>
      <div>
        {/* 区块标题占位 */}
        <div className="h-5 w-40 animate-pulse bg-muted" />
        {/* 细线 */}
        <div className="mb-4 mt-2 h-px w-full bg-border" />
        {/* 双列条目形骨架 */}
        <div className="galvelica-grid-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="galvelica-entry">
              <div className="min-h-[72px] animate-pulse bg-muted" />
              <div className="aspect-[3/4] w-[62px] animate-pulse bg-muted" />
              <div>
                <div className="h-4 w-3/5 animate-pulse bg-muted" />
                <div className="mt-2 h-3 w-2/5 animate-pulse bg-muted" />
              </div>
              <div className="h-4 w-10 animate-pulse bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
