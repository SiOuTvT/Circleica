import { ArchiveHero } from "@/components/archive/archive-hero"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "隐私政策",
  description: "Circleica 隐私政策：说明我们收集哪些数据、如何使用与保护，以及你的相关权利。",
  openGraph: { siteName: "Circleica", title: "隐私政策", description: "Circleica 隐私政策与数据使用说明", images: ["/opengraph-image"] },
  alternates: { canonical: "/privacy" },
}

/**
 * 隐私政策（静态页）。
 * 内容聚焦「收集哪些数据 / 用途 / Cookie / 联系方式」，面向中文站（Galgame 资源社区）受众；
 * 将来如需后台可编辑，再按 page_about/page_rules 的方式接入 site-settings 即可。
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[880px] py-6 sm:py-8 px-4">
      <ArchiveHero
        variant="privacy"
        eyebrow="PRIVACY"
        title="隐私政策"
        className="mb-6"
      />
      <div className="rounded-2xl bg-card ring-1 ring-border p-6">
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">一、我们收集哪些信息</h2>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li><span className="text-foreground font-medium">账号信息</span>：注册时提供的用户名、邮箱地址（仅用于登录与找回密码）。</li>
              <li><span className="text-foreground font-medium">你主动发布的内容</span>：评论、帖子、收藏夹、收藏记录、举报反馈等。</li>
              <li><span className="text-foreground font-medium">使用数据</span>：为了提供「浏览历史 / 继续观看」等功能，我们会记录你浏览过的作品；此外会记录 IP 地址用于安全与频率限制（不长期留存）。</li>
              <li><span className="text-foreground font-medium">Cookie</span>：用于维持登录状态，以及记住你的浏览偏好（如 NSFW 内容显示模式、主题）。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">二、我们如何使用这些信息</h2>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>提供并维护站点的核心功能（登录、收藏、评论、浏览历史、个性化推荐）。</li>
              <li>识别并防范滥用、垃圾内容与恶意访问（频率限制、账号安全）。</li>
              <li>不会出售或出租你的个人信息；除满足法律要求或保护站点安全所必需外，不向第三方披露。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">三、数据留存与删除</h2>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>你发布的内容保留至你主动删除或账号注销为止。</li>
              <li>用于频率限制的 IP 记录仅保留很短时间（分钟到小时级）后自动清除。</li>
              <li>如需删除账号或导出、更正个人数据，请通过「联系我们」页面联系管理员。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">四、第三方服务</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              本站可能使用第三方服务（如对象存储用于图片托管、邮件服务用于发送验证邮件）。这些服务仅接收完成其功能所必需的数据。
              作品资料中的外链（如 VNDB、Steam、Bangumi）由你点击后跳转至第三方网站，其隐私做法不受本站控制。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">五、联系我们</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              对本政策有任何疑问，或希望行使你的数据权利，请通过「联系我们」页面（/contact）与我们取得联系。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
