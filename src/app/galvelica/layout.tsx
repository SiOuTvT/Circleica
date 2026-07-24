import type { ReactNode } from "react"
import { GalvelicaShell } from "@/components/galvelica/galvelica-shell"

export default function GalvelicaLayout({ children }: { children: ReactNode }) {
  return <GalvelicaShell>{children}</GalvelicaShell>
}
