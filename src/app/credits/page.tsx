import { CreditsClient } from "@/components/credits-client"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "制作组图鉴",
  description: "探索每部作品背后的创作者，发现脚本家、画师、音乐人等",
  openGraph: { title: "制作组图鉴 · Circleica", description: "探索每部作品背后的创作者", images: ["/opengraph-image"] },
  alternates: { canonical: "/credits" },
}

export default function CreditsPage() {
  return (
    <div>
      <CreditsClient />
    </div>
  )
}
