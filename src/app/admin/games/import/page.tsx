import { requireAdmin } from "@/lib/admin"
import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const VNDBImportManager = dynamic(() => import("@/components/vndb-import-manager").then(m => ({ default: m.VNDBImportManager })), {
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
})

export const metadata = { title: "VNDB 导入 · 管理后台" }

export default async function VNDBImportPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/games"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          返回游戏管理
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">VNDB 批量导入</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          从 VNDB 自动导入同人视觉小说数据，系统会验证作品信息并创建草稿。
        </p>
      </div>

      <VNDBImportManager />

      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <h3 className="mb-3 text-sm font-semibold text-foreground">使用说明</h3>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>输入 VNDB 视觉小说 ID（纯数字），可以在 VNDB 网站 URL 中找到，例如 vndb.org/v<strong>12345</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>支持批量导入，每行一个 ID 或用逗号分隔</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>系统会自动获取标题、原作、标签等信息</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>导入的游戏默认为「草稿」状态，需要手动编辑后发布</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>已存在的 VNDB ID 会被跳过，不会重复导入</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
