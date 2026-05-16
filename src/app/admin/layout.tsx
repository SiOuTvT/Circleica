import { AdminNav } from "@/components/admin-nav"
import { requireAdmin } from "@/lib/admin"

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