import { getSiteSetting } from "@/lib/site-settings"
import { RichTextContent } from "@/components/rich-text-content-wrapper"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "关于",
  description: "了解Circleica —— 面向 Galgame/视觉小说爱好者的社区平台，提供游戏资源下载、评论、收藏等功能",
  openGraph: { title: "关于 · Circleica", description: "面向 Galgame/视觉小说爱好者的社区平台", images: ["/opengraph-image"] },
  alternates: { canonical: "/about" },
}

const DEFAULT_ABOUT_HTML = `<h2 class="text-lg font-semibold text-foreground mb-2">我们是谁</h2>
<p class="text-sm text-muted-foreground leading-relaxed">
Circleica是一个面向 Galgame/视觉小说爱好者的社区平台。
我们致力于为玩家提供一个发现、分享、讨论同人游戏的一站式入口。
</p>

<h2 class="text-lg font-semibold text-foreground mb-3">核心功能</h2>
<div class="grid gap-3 sm:grid-cols-2">
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">游戏收录</h3>
<p class="text-xs text-muted-foreground leading-relaxed">收录海量同人游戏资源，支持标签筛选、搜索、收藏</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">制作组图鉴</h3>
<p class="text-xs text-muted-foreground leading-relaxed">通过 VNDB 数据展示脚本家、画师、音乐人等创作者信息</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">社区论坛</h3>
<p class="text-xs text-muted-foreground leading-relaxed">求档、讨论、分享，社区互助的讨论空间</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">收藏合集</h3>
<p class="text-xs text-muted-foreground leading-relaxed">自由创建收藏夹，管理你的游戏库</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">成就系统</h3>
<p class="text-xs text-muted-foreground leading-relaxed">签到、收藏、评论解锁成就徽章</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">角色图鉴</h3>
<p class="text-xs text-muted-foreground leading-relaxed">浏览游戏角色设定，随机发现新角色</p>
</div>
</div>

<h2 class="text-lg font-semibold text-foreground mb-2">技术栈</h2>
<p class="text-sm text-muted-foreground leading-relaxed">
Next.js 16 · React 19 · Prisma ORM · PostgreSQL · NextAuth v5 · Cloudflare R2 · Upstash Redis · TipTap 富文本编辑器 · shadcn/ui · Tailwind CSS
</p>`

export default async function AboutPage() {
  const custom = await getSiteSetting("page_about")

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">关于Circleica</h1>
      <div className="rounded-2xl bg-card ring-1 ring-border p-6">
        {custom ? <RichTextContent html={custom} /> : <div dangerouslySetInnerHTML={{ __html: DEFAULT_ABOUT_HTML }} />}
      </div>
    </div>
  )
}