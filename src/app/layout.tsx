import { LayoutShiftGuard } from "@/components/layout-shift-guard"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Providers } from "@/components/providers"
import { ThemeScript } from "@/components/theme-script"
import { isSiteInitialized, getSiteName, getSiteDescription, getSiteLogo, getSiteSetting, getLogoMode } from "@/lib/site-settings"
import { waitForServiceConfig } from "@/lib/service-config"
import { checkSecurity } from "@/lib/security-check"
import { headers } from "next/headers"
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

  // nonce 由 proxy 中间件注入请求头，这里读取后传给 ThemeScript（避免 ThemeScript 自己调 headers()）
  const nonce = (await headers()).get("x-nonce") || undefined

  // 权威主题色：走 unstable_cache（TTL 60s），后台改主题色时 updateSiteSettings 已 revalidateTag
  // 即时失效 → 写后立即生效，且不再每个请求直查 DB。
  const themeColor = await getSiteSetting("themeColor", "#4C7E96")

  // 未初始化时：仍渲染完整 HTML + SessionProvider，但显示 Setup Wizard
  // 这样 Setup 中的 signIn() 可以正常工作
  if (!initialized) {
    return (
      <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
        <head><ThemeScript themeColor={themeColor} nonce={nonce} /></head>
        <body className="min-h-screen bg-background text-foreground">
          <Providers>
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
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript themeColor={themeColor} nonce={nonce} />
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
        <Providers>
          <LayoutWrapper siteName={siteName} logoMode={logoMode} siteLogo={siteLogo}>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
