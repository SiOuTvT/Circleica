import type { Metadata } from "next"
import { StudioArchiveClient } from "@/components/archive/studio-archive-client"

export const metadata: Metadata = {
  title: "制作组图鉴 · Circleica",
  description: "浏览 Circleica 中的同人社团、小型制作组与个人作者档案，按名称首字索引。",
}

export default function StudioArchivePage() {
  return <StudioArchiveClient />
}
