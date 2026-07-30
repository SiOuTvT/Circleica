import type { Metadata } from "next"
import { StudioArchiveClient } from "@/components/archive/studio-archive-client"

export const metadata: Metadata = {
  title: "制作组图鉴 · Circleica",
  description: "浏览 Circleica 中的同人社团、小型制作组与作者档案，按名称首字索引。",
  alternates: { canonical: "/credits" },
}

export default function CreditsPage() {
  // 制作组图鉴已纯化：仅保留社团/小型制作组的展示与搜索（创作者独立为 /creators）
  return <StudioArchiveClient />
}
