import { requireSuperAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { SmilePlus } from "lucide-react"
import dynamic from "next/dynamic"

const EmotionalMessagesManager = dynamic(() => import("./manager").then(m => ({ default: m.EmotionalMessagesManager })), {
  loading: () => <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "情感消息管理 · 管理后台" }

export default async function EmotionalMessagesPage() {
  await requireSuperAdmin()
  const items = await prisma.emotionalMessage.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  })
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="EMOTIONAL MESSAGES"
        title="情感消息管理"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" size="lg">{items.length} 条消息</Badge>
            <span>管理各场景的提示文案、插图和 Emoji</span>
          </span>
        }
      />
      <EmotionalMessagesManager initialItems={items.map(item => ({
        id: item.id,
        key: item.key,
        category: item.category,
        title: item.title,
        subtitle: item.subtitle,
        imageUrl: item.imageUrl,
        emoji: item.emoji,
        enabled: item.enabled,
      }))} />
    </div>
  )
}