import type { ComponentType, SVGProps } from "react"
import { BookOpen, Coffee, HelpCircle, MessageCircle, Package } from "lucide-react"

export type ForumCategory = {
  value: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

// 规范化论坛分类常量：1:1 复用 Prisma 枚举 ForumPostCategory 的取值，零 schema 变更。
// 顺序遵循业务优先级：求档 → 资源 → 攻略 → 讨论 → 杂谈。
// forum-filters / forum-sidebar / new-post-modal 共享此单一来源，避免各处分散硬编码导致分类漏显。
export const FORUM_CATEGORIES: ForumCategory[] = [
  { value: "question", label: "求档", icon: HelpCircle },
  { value: "showcase", label: "资源", icon: Package },
  { value: "guide", label: "攻略", icon: BookOpen },
  { value: "discussion", label: "讨论", icon: MessageCircle },
  { value: "feedback", label: "杂谈", icon: Coffee },
]
