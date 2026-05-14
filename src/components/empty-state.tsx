"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, FileQuestion, Gamepad2, Heart, Inbox, MessageSquare, Music, Search, Users } from "lucide-react"

const ICONS: Record<string, typeof Inbox> = {
  inbox: Inbox,
  search: Search,
  comment: MessageSquare,
  heart: Heart,
  alert: AlertTriangle,
  users: Users,
  music: Music,
  game: Gamepad2,
  question: FileQuestion,
}

interface EmptyStateProps {
  icon?: keyof typeof ICONS | string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon = "inbox", title, description, action, className }: EmptyStateProps) {
  const Icon = ICONS[icon] || Inbox
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="mb-4 rounded-2xl bg-muted/50 p-5">
        <Icon className="h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}