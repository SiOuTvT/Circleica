import { requireAdmin } from "@/lib/admin"
import dynamic from "next/dynamic"

const AdminNav = dynamic(() => import("@/components/admin-nav").then(m => ({ default: m.AdminNav })), {
  loading: () => (
    <>
      {/* 桌面端骨架 */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[220px] flex-col border-r border-border bg-card/95 md:flex">
        <div className="flex h-14 items-center border-b border-border px-3">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
        <nav className="flex-1 px-2 py-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </nav>
      </aside>
      {/* 手机端骨架 */}
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 md:hidden">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
      </nav>
    </>
  ),
})

export const metadata = { title: "管理后台 · 同人游戏站" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      {/* 桌面端：左边距为侧边栏留空间（收缩 68px / 展开 220px） */}
      <main className="admin-main min-h-screen pt-14 md:pt-0 md:pl-[220px] transition-[padding] duration-300 ease-in-out">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-8 sm:py-5">
          {children}
        </div>
      </main>
    </div>
  )
}
