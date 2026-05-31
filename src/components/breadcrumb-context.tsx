"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

interface BreadcrumbContextType {
  /** 动态段的标签映射，例如 { "abc123": "星之梦" } */
  dynamicLabels: Record<string, string>
  setDynamicLabel: (segment: string, label: string | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  dynamicLabels: {},
  setDynamicLabel: () => {},
})

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})

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
    <BreadcrumbContext.Provider value={{ dynamicLabels, setDynamicLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext)
}