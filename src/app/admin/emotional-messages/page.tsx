import { requireSuperAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
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
      <div className="flex items-center gap-3">
        <SmilePlus className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">情感消息管理</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {items.length} 条消息
        </span>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        管理各场景的提示文案、插图和 Emoji。修改后会实时影响前台用户看到的提示。
      </p>
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