"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

export interface CrumbItem {
  label: string
  href: string
}

interface BreadcrumbContextType {
  /** 动态段的标签映射，例如 { "abc123": "星之梦" } */
  dynamicLabels: Record<string, string>
  setDynamicLabel: (segment: string, label: string | null) => void
  /** 当前页面的父级面包屑路径 */
  parentCrumbs: CrumbItem[]
  setParentCrumbs: (crumbs: CrumbItem[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  dynamicLabels: {},
  setDynamicLabel: () => {},
  parentCrumbs: [],
  setParentCrumbs: () => {},
})

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})
  const [parentCrumbs, setParentCrumbs] = useState<CrumbItem[]>([])

  const setDynamicLabel = useCallback((segment: string, label: string | null) => {
    setDynamicLabels((prev) => {
      if (label === null) {
        const { [segment]: _, ...rest } = prev
        return rest
      }
      if (prev[segment] === label) return prev
      return { ...prev, [segment]: label }
    })
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ dynamicLabels, setDynamicLabel, parentCrumbs, setParentCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext)
}
