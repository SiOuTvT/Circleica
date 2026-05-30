"use client"

import { SearchBar } from "@/components/search-bar"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="relative">
        <div className="text-8xl font-bold text-muted-foreground/20 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl">🎮</div>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">迷路了？</h1>
      <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
        这个页面似乎已经被传送到了另一个世界。<br />
        别担心，搜索或点击下方按钮回到安全区域。
      </p>
      <div className="w-full max-w-md">
        <SearchBar />
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary transition-all hover:opacity-90 btn-spring"
        >
          🏠 返回首页
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
