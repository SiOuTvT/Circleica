import type { Metadata } from "next"
import type { ReactNode } from "react"
import { GalvelicaShell } from "@/components/galvelica/galvelica-shell"

/**
 * 副站自带 metadata：站名用纯字符串 title 承载，且故意不设 template ——
 * 副站各页 title 已自带 Galvelica 站名，再加 template 会导致站名重复出现。
 */
export const metadata: Metadata = {
  title: "Galvelica",
}

export default function GalvelicaLayout({ children }: { children: ReactNode }) {
  return <GalvelicaShell>{children}</GalvelicaShell>
}
