"use client"

import { useEffect } from "react"
import { useBreadcrumb } from "@/components/breadcrumb-context"

/**
 * 为 Galvelica 作品档案页注册面包屑：
 * 父级 = Galvelica → 作品档案，动态段 = serialId → 作品标题
 */
export function GalvelicaWorkBreadcrumb({ serialId, title }: { serialId: string; title: string }) {
  const { setDynamicLabel, setParentCrumbs } = useBreadcrumb()

  useEffect(() => {
    setParentCrumbs([
      { label: "Galvelica", href: "/galvelica" },
      { label: "作品档案", href: "/galvelica/works" },
    ])
    setDynamicLabel(serialId, title)
    return () => {
      setParentCrumbs([])
      setDynamicLabel(serialId, null)
    }
  }, [serialId, title, setDynamicLabel, setParentCrumbs])

  return null
}
