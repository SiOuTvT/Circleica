import { LayoutWrapper } from "@/components/layout-wrapper"
import { Providers } from "@/components/providers"
import { ThemeScript } from "@/components/theme-script"
import { isSiteInitialized, getSiteName, getSiteDescription, getSiteLogo } from "@/lib/site-settings"
import { waitForServiceConfig } from "@/lib/service-config"
import { checkSecurity } from "@/lib/security-check"
import type { Metadata, Viewport } from "next"
import { Noto_Sans_SC } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import { SetupWizard } from "@/components/setup-wizard"
import "./globals.css"

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-sans",
  preload: true,
})

// 启动时安全检查（仅开发环境输出警告）
checkSecurity()

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Fangame"
  let siteDesc = "Galgame/视觉小说社区平台"
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
      default: `${siteName} · 资源大厅`,
      template: `%s · ${siteName}`,
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

  // 未初始化时：仍渲染完整 HTML + SessionProvider，但显示 Setup Wizard
  // 这样 Setup 中的 signIn() 可以正常工作
  if (!initialized) {
    return (
      <html lang="zh-CN" className={`h-full antialiased ${notoSans.variable}`} suppressHydrationWarning>
        <head><ThemeScript /></head>
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

  return (
    <html lang="zh-CN" className={`h-full antialiased ${notoSans.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full overflow-x-hidden bg-background text-foreground">
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
          <LayoutWrapper siteName={siteName}>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
