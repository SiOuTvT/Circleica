import { LayoutWrapper } from "@/components/layout-wrapper"
import { Providers } from "@/components/providers"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "同人游戏站 · 资源大厅",
  description: "东方、月姬、Fate 等同人游戏资源一站式体验",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  )
}
