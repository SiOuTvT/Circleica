import type { Metadata } from "next"
import { CreatorArchiveClient } from "@/components/archive/creator-archive-client"

export const metadata: Metadata = {
  title: "创作者图鉴 · Circleica",
  description: "浏览 Circleica 中的创作者档案：脚本、原画、音乐、导演，以及他们的参与作品。",
  alternates: { canonical: "/creators" },
}

export default function CreatorsPage() {
  return <CreatorArchiveClient />
}
