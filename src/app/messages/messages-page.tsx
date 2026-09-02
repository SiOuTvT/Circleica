"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MessageCircle, Bell } from "lucide-react"
import MessagesContent from "./messages-content"
import NotificationsContent from "./notifications-content"

type Tab = "messages" | "notifications"

const TABS: { key: Tab; label: string; icon: typeof MessageCircle }[] = [
  { key: "messages", label: "私信", icon: MessageCircle },
  { key: "notifications", label: "通知", icon: Bell },
]

export default function UnifiedMessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("messages")

  return (
    <div className="pt-1">
      {/* 页面头部 */}
      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-fit shrink-0 items-center justify-center text-primary">
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">MESSAGES</p>
          <h1 className="font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">私信与通知</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            与圈内同好私聊，查看站内通知。
          </p>
        </div>
      </header>

      {/* Tab 切换（在左侧面板内部） */}
      {activeTab === "messages" ? <MessagesContent tabNav={<TabNav activeTab={activeTab} onTabChange={setActiveTab} />} /> : <NotificationsContent tabNav={<TabNav activeTab={activeTab} onTabChange={setActiveTab} />} />}
    </div>
  )
}

function TabNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <div className="flex gap-1.5 mb-2">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition duration-150 ease-in-out",
            activeTab === tab.key
              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <tab.icon className="h-4 w-4" strokeWidth={2} />
          {tab.label}
        </button>
      ))}
    </div>
  )
}
