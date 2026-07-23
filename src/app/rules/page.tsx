import { getSiteSetting } from "@/lib/site-settings"
import { RichTextContent } from "@/components/rich-text-content-wrapper"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "社区规则",
  description: "Circleica社区规则与行为准则，维护良好的社区环境",
  openGraph: { title: "社区规则 · Circleica", description: "社区规则与行为准则", images: ["/opengraph-image"] },
  alternates: { canonical: "/rules" },
}

const DEFAULT_RULES_HTML = `<div class="space-y-8">
<section>
<h2 class="text-lg font-semibold text-foreground mb-3">一、用户行为准则</h2>
<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
<li>尊重其他用户，禁止人身攻击、地域歧视、性别歧视等恶意行为。</li>
<li>禁止发布虚假信息、恶意引导或钓鱼内容。</li>
<li>禁止刷屏、恶意灌水或使用自动化工具干扰社区正常运行。</li>
<li>每个用户仅限一个账号，禁止多账号规避处罚。</li>
</ul>
</section>

<section>
<h2 class="text-lg font-semibold text-foreground mb-3">二、内容规范</h2>
<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
<li>游戏资源请注明来源，尊重原作者版权。</li>
<li>禁止发布违法违规、涉及未成年人不当内容的资源。</li>
<li>NSFW 内容必须正确标记，未标记将被管理员强制处理。</li>
<li>评论和帖子请保持与主题相关，禁止无意义水帖。</li>
<li>禁止发布广告、推广链接或垃圾营销内容。</li>
</ul>
</section>

<section>
<h2 class="text-lg font-semibold text-foreground mb-3">三、举报机制</h2>
<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
<li>发现违规内容可通过游戏详情页的「举报」功能反馈。</li>
<li>资源失效可通过资源区的「报告死链」功能提交。</li>
<li>管理员将在 24 小时内处理举报，严重违规内容将立即下架。</li>
</ul>
</section>

<section>
<h2 class="text-lg font-semibold text-foreground mb-3">四、违规处理</h2>
<ul class="space-y-2 text-sm text-muted-foreground leading-relaxed">
<li><span class="text-foreground font-medium">警告</span>：首次轻微违规，系统提醒。</li>
<li><span class="text-foreground font-medium">内容删除</span>：违规内容将被移除，创作者会收到通知。</li>
<li><span class="text-foreground font-medium">封禁账号</span>：严重或多次违规，账号将被永久封禁。</li>
</ul>
</section>
</div>`

export default async function RulesPage() {
  const custom = await getSiteSetting("page_rules")

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">社区规则</h1>
      <div className="rounded-2xl bg-card ring-1 ring-border p-6">
        {custom ? <RichTextContent html={custom} /> : <div dangerouslySetInnerHTML={{ __html: DEFAULT_RULES_HTML }} />}
      </div>
    </div>
  )
}