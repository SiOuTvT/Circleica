import { LayoutWrapper } from "@/components/layout-wrapper"
import { Providers } from "@/components/providers"
import { ThemeScript } from "@/components/theme-script"
import type { Metadata, Viewport } from "next"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
  },
  twitter: {
    card: "summary_large_image",
    title: "同人游戏站 · 资源大厅",
    description: "东方、月姬、Fate 等同人游戏资源一站式体验",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
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
