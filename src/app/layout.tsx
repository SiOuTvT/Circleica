import { LayoutWrapper } from "@/components/layout-wrapper"
import { Providers } from "@/components/providers"
import { ThemeScript } from "@/components/theme-script"
import { checkSecurity } from "@/lib/security-check"
import type { Metadata, Viewport } from "next"
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
  preload: true,
})

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif",
  preload: false,
})

// 启动时安全检查（仅开发环境输出警告）
checkSecurity()

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: {
    default: "同人游戏站 · 资源大厅",
    template: "%s · 同人游戏站",
  },
  description: "东方、月姬、Fate 等同人游戏资源一站式体验，提供下载、评论、收藏等功能",
  keywords: ["同人游戏", "东方Project", "月姬", "Fate", "同人", "二次元游戏", "Galgame"],
  authors: [{ name: "同人游戏站" }],
  creator: "同人游戏站",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "同人游戏站",
    title: "同人游戏站 · 资源大厅",
    description: "东方、月姬、Fate 等同人游戏资源一站式体验",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "同人游戏站 · 资源大厅",
    description: "东方、月姬、Fate 等同人游戏资源一站式体验",
    images: ["/opengraph-image"],
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="zh-CN" className={`h-full antialiased ${notoSans.variable} ${notoSerif.variable}`} suppressHydrationWarning>
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
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
