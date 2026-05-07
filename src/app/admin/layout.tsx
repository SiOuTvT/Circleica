import { AdminNav } from "@/components/admin-nav"
import { requireAdmin } from "@/lib/admin"

export const metadata = { title: "管理后台 · 同人游戏站" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-[1300px] px-4 py-4 sm:px-6 sm:py-5 lg:ml-[max(calc((100vw-1200px)/2),0px)]">
        {children}
      </main>
    </div>
  )
}
