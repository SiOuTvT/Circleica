import { LayoutShiftGuard } from "@/components/layout-shift-guard"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Providers } from "@/components/providers"
import { ThemeScript } from "@/components/theme-script"
import { resolveThemeTokens } from "@/lib/theme-colors-shared"
import { isSiteInitialized, getSiteName, getSiteDescription, getSiteLogo, getSiteSetting, getLogoMode } from "@/lib/site-settings"
import { waitForServiceConfig } from "@/lib/service-config"
import { checkSecurity } from "@/lib/security-check"
import type { Metadata, Viewport } from "next"
import NextTopLoader from "nextjs-toploader"
import { SetupWizard } from "@/components/setup-wizard"
import "./globals.css"

// 启动时安全检查（仅开发环境输出警告）
checkSecurity()

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Circleica"
  let siteDesc = "Circleica - 极客同人社区 | 完全免费开放的视觉小说档案库"
  let siteLogo: string | null = null

  try {
    ;[siteName, siteDesc, siteLogo] = await Promise.all([
      getSiteName(),
      getSiteDescription(),
      getSiteLogo(),
    ])
  } catch {
    // 构建期无数据库连接，使用默认值
  }

  const ogImages = siteLogo ? [siteLogo] : ["/opengraph-image"]

  return {
    title: {
      default: `Circleica - 专注同人视觉小说资源收录`,
      template: `%s · Circleica`,
    },
    description: siteDesc,
    keywords: ["同人游戏", "东方Project", "月姬", "Fate", "同人", "二次元游戏", "Galgame"],
    authors: [{ name: siteName }],
    creator: siteName,
    metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName,
      title: `${siteName} · 资源大厅`,
      description: siteDesc,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} · 资源大厅`,
      description: siteDesc,
      images: ogImages,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    alternates: {
      canonical: "/",
    },
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 等待服务配置从数据库加载完成（仅首次请求时阻塞，后续立即返回）
  await waitForServiceConfig()

  const initialized = await isSiteInitialized()

  // 权威主题色：走 unstable_cache（TTL 60s），后台改主题色时 updateSiteSettings 已 revalidateTag
  // 即时失效 → 写后立即生效，且不再每个请求直查 DB。
  // 注意：这里不再调用 headers() 读取 nonce —— 那一处动态 API 曾把全站钉死成 dynamic。
  // nonce 改由 proxy.ts 的 CSP 'sha256-...' 放行 ThemeScript（内容固定，无需 nonce），
  // 主题色 CSS 变量改由下方内联 <style> 注入（style-src 允许 'unsafe-inline'）。
  const themeColor = await getSiteSetting("themeColor", "#4C7E96")
  const t = resolveThemeTokens(themeColor)
  const themeStyle = `:root{--primary:${t.primary};--theme-color:${t.primary};--theme-color-hover:${t.primary};--theme-color-active:${t.primary};--clr-blue:${t.primary};--clr-sky:${t.accent};--ring:${t.ring};--clr-glow:${t.glow};}`
  // 内联 <html> style：元素内联样式优先级高于任何 :root 规则（含 globals.css 默认薄荷绿），
  // 首帧即正确主题色，彻底摆脱 <head> 级联顺序依赖，消除主题闪烁（FOUC）。
  const themeVars = {
    "--primary": t.primary,
    "--theme-color": t.primary,
    "--theme-color-hover": t.primary,
    "--theme-color-active": t.primary,
    "--clr-blue": t.primary,
    "--clr-sky": t.accent,
    "--ring": t.ring,
    "--clr-glow": t.glow,
  } as React.CSSProperties

  // 未初始化时：仍渲染完整 HTML + SessionProvider，但显示 Setup Wizard
  // 这样 Setup 中的 signIn() 可以正常工作
  if (!initialized) {
    return (
    <html lang="zh-CN" className="h-full antialiased" style={themeVars} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <ThemeScript />
      </head>
        <body className="min-h-screen bg-background text-foreground">
          <Providers themeColor={themeColor}>
            <div className="min-h-screen flex items-center justify-center p-4">
              <SetupWizard />
            </div>
          </Providers>
        </body>
      </html>
    )
  }

  const siteName = await getSiteName()
  const [logoMode, siteLogo] = await Promise.all([getLogoMode(), getSiteLogo()])

  return (
    <html lang="zh-CN" className="h-full antialiased" style={themeVars} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <ThemeScript />
      </head>
      <body className="min-h-full overflow-x-hidden bg-background text-foreground" suppressHydrationWarning>
        <LayoutShiftGuard />
        <NextTopLoader
          color="var(--primary)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px var(--primary),0 0 5px var(--primary)"
          zIndex={9999}
        />
        <Providers themeColor={themeColor}>
          <LayoutWrapper siteName={siteName} logoMode={logoMode} siteLogo={siteLogo}>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
