import { CreditsClient } from "@/components/credits-client"

export const metadata = {
  title: "制作组图鉴 · 同人游戏站",
  description: "探索每部作品背后的创作者，发现脚本家、画师、音乐人等",
}

export default function CreditsPage() {
  return (
    <div className="py-6 sm:py-8">
      <CreditsClient />
    </div>
  )
}
