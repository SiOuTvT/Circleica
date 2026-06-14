import { requireAdmin } from "@/lib/admin"
import { getSiteSettings } from "@/lib/site-settings"
import { PagesManager } from "./pages-manager"
import { FileText } from "lucide-react"

export const metadata = { title: "页面管理 · 管理后台" }

// 默认页面内容（与前台页面保持一致）
// 注意：这些 HTML 结构与前台 DefaultAbout 组件的视觉效果一致
const DEFAULT_CONTENTS: Record<string, string> = {
  page_about: `<h2>我们是谁</h2>
<p>同人游戏站是一个面向 Galgame/视觉小说爱好者的社区平台。</p>
<p>我们致力于为玩家提供一个发现、分享、讨论同人游戏的一站式入口。</p>
<h2>核心功能</h2>
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
<h2>技术栈</h2>
<p>Next.js 16 · React 19 · Prisma ORM · PostgreSQL · NextAuth v5 · Cloudflare R2 · Upstash Redis · TipTap 富文本编辑器 · shadcn/ui · Tailwind CSS</p>`,
  page_rules: `<h2>一、用户行为准则</h2>
<ul>
<li>尊重其他用户，禁止人身攻击、地域歧视、性别歧视等恶意行为。</li>
<li>禁止发布虚假信息、恶意引导或钓鱼内容。</li>
<li>禁止刷屏、恶意灌水或使用自动化工具干扰社区正常运行。</li>
<li>每个用户仅限一个账号，禁止多账号规避处罚。</li>
</ul>
<h2>二、内容规范</h2>
<ul>
<li>游戏资源请注明来源，尊重原作者版权。</li>
<li>禁止发布违法违规、涉及未成年人不当内容的资源。</li>
<li>NSFW 内容必须正确标记，未标记将被管理员强制处理。</li>
<li>评论和帖子请保持与主题相关，禁止无意义水帖。</li>
<li>禁止发布广告、推广链接或垃圾营销内容。</li>
</ul>
<h2>三、举报机制</h2>
<ul>
<li>发现违规内容可通过游戏详情页的「举报」功能反馈。</li>
<li>资源失效可通过资源区的「报告死链」功能提交。</li>
<li>管理员将在 24 小时内处理举报，严重违规内容将立即下架。</li>
</ul>
<h2>四、违规处理</h2>
<ul>
<li><strong>警告</strong>：首次轻微违规，系统提醒。</li>
<li><strong>内容删除</strong>：违规内容将被移除，创作者会收到通知。</li>
<li><strong>封禁账号</strong>：严重或多次违规，账号将被永久封禁。</li>
</ul>`,
  page_contact: `<h2>反馈渠道</h2>
<h3>论坛反馈</h3>
<p>访问 <a href="/forum">社区论坛</a> 发帖，选择对应分类（求档 / 讨论 / 资源），其他用户和管理员都能看到并回复。</p>
<h3>资源问题</h3>
<p>下载链接失效？在游戏资源区点击「报告死链」按钮，我们会尽快修复。</p>
<h3>违规举报</h3>
<p>发现违规内容？使用游戏详情页的「举报」功能，管理员会及时处理。</p>
<h2>开源项目</h2>
<p>本项目基于 Next.js 构建，欢迎关注我们的 GitHub 仓库获取最新动态。</p>
<p>如果你发现了 Bug 或有功能建议，也欢迎通过 Issue 反馈。</p>
<h2>常见问题</h2>
<p><strong>Q: 如何注册账号？</strong><br>A: 点击右上角登录按钮，选择注册即可。</p>
<p><strong>Q: 如何收藏游戏？</strong><br>A: 在游戏详情页点击心形按钮，可选择收藏到指定合集。</p>
<p><strong>Q: 如何发布资源？</strong><br>A: 注册后联系管理员申请发布权限，或通过论坛求档区反馈。</p>`,
}

export default async function AdminPagesPage() {
  await requireAdmin()
  const settings = await getSiteSettings()

  // 合并数据库内容和默认内容：数据库优先级更高
  const contents = { ...DEFAULT_CONTENTS, ...settings }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">页面管理</h1>
      </div>
      <p className="text-xs text-muted-foreground">编辑页脚链接指向的静态页面内容。修改后会覆盖默认内容。</p>
      <PagesManager initial={contents} />
    </div>
  )
}