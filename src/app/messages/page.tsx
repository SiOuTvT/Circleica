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
      {/* 顶部 Tab 切换 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" strokeWidth={2} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      {activeTab === "messages" ? <MessagesContent /> : <NotificationsContent />}
    </div>
  )
}
