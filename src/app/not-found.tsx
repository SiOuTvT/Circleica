"use client"

import { SearchBar } from "@/components/search-bar"
import { useEmotionalMessage } from "@/hooks/use-emotional-messages"
import { Gamepad2, Home } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  const { message: notFoundMsg } = useEmotionalMessage("error_404")
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="relative">
        <div className="text-8xl font-bold text-muted-foreground/30 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">{notFoundMsg ? `${notFoundMsg.emoji} ${notFoundMsg.title}` : "迷路了？"}</h1>
      <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
        {notFoundMsg ? notFoundMsg.subtitle : "这个页面似乎已经被传送到了另一个世界。"}<br />
        别担心，搜索或点击下方按钮回到安全区域。
      </p>
      <div className="w-full max-w-md">
        <SearchBar />
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary transition-all hover:opacity-90 btn-spring"
        >
          <Home className="h-4 w-4" /> 返回首页
        </Link>
        <button
          onClick={() => window.history.back()}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground border border-border transition-colors hover:bg-muted btn-spring"
        >
          ← 返回上页
        </button>
      </div>
    </div>
  )
}
