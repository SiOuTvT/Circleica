import { getSiteSetting } from "@/lib/site-settings"
import { RichTextContent } from "@/components/rich-text-content-wrapper"

export const metadata = { title: "联系我们 · 同人游戏站" }

const DEFAULT_CONTACT_HTML = `<h2>反馈渠道</h2>
<div class="grid gap-3 sm:grid-cols-2">
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">论坛反馈</h3>
<p class="text-xs text-muted-foreground">
访问 <a href="/forum" class="text-primary hover:underline">社区论坛</a> 发帖，选择对应分类（求档 / 讨论 / 资源），
其他用户和管理员都能看到并回复。
</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">资源问题</h3>
<p class="text-xs text-muted-foreground">
下载链接失效？在游戏资源区点击「报告死链」按钮，我们会尽快修复。
</p>
</div>
<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">违规举报</h3>
<p class="text-xs text-muted-foreground">
发现违规内容？使用游戏详情页的「举报」功能，管理员会及时处理。
</p>
</div>
</div>

<h2>开源项目</h2>
<p class="text-sm text-muted-foreground leading-relaxed">
本项目基于 Next.js 构建，欢迎关注我们的 GitHub 仓库获取最新动态。
如果你发现了 Bug 或有功能建议，也欢迎通过 Issue 反馈。
</p>
<div class="mt-3">
<a href="https://github.com" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:bg-secondary/80">
GitHub 仓库
</a>
</div>

<h2>常见问题</h2>
<div class="grid gap-3 sm:grid-cols-2">
<div class="rounded-xl bg-secondary/20 p-4">
<p class="text-sm font-medium text-foreground mb-1">Q: 如何注册账号？</p>
<p class="text-xs text-muted-foreground">A: 点击右上角登录按钮，选择注册即可。</p>
</div>
<div class="rounded-xl bg-secondary/20 p-4">
<p class="text-sm font-medium text-foreground mb-1">Q: 如何收藏游戏？</p>
<p class="text-xs text-muted-foreground">A: 在游戏详情页点击心形按钮，可选择收藏到指定合集。</p>
</div>
<div class="rounded-xl bg-secondary/20 p-4">
<p class="text-sm font-medium text-foreground mb-1">Q: 如何发布资源？</p>
<p class="text-xs text-muted-foreground">A: 注册后联系管理员申请发布权限，或通过论坛求档区反馈。</p>
</div>
</div>`

export default async function ContactPage() {
  const custom = await getSiteSetting("page_contact")

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">联系我们</h1>
      <div className="rounded-2xl bg-card ring-1 ring-border p-6">
        {custom ? <RichTextContent html={custom} /> : <div dangerouslySetInnerHTML={{ __html: DEFAULT_CONTACT_HTML }} />}
      </div>
    </div>
  )
}
