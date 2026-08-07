import { requireSiteAdmin } from "@/lib/auth-context"
import { getGalvelicaThemeSettings } from "@/lib/site-settings"
import { AdminPageContainer } from "@/components/admin-page-container"
import { GalvelicaThemeClient } from "./client"

export const dynamic = "force-dynamic"

export const metadata = { title: "副站主题设置 · 管理后台" }

export default async function GalvelicaThemePage() {
  await requireSiteAdmin("galvelica")
  const settings = await getGalvelicaThemeSettings()

  return (
    <AdminPageContainer
      galvelica
      eyebrow="GALVELICA · THEME"
      title="副站主题设置"
      description="独立于主站主题：颜色/圆角/阴影/着色全部写入 galvelica: 命名空间，只作用于 Galvelica 副站（--gal-accent 等），主站主题完全不受影响。"
    >
      <GalvelicaThemeClient initialSettings={settings} />
    </AdminPageContainer>
  )
}
