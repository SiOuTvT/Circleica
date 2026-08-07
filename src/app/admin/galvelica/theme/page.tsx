import { requireSiteAdmin } from "@/lib/auth-context"
import { getGalvelicaThemeColor } from "@/lib/site-settings"
import { AdminPageContainer } from "@/components/admin-page-container"
import { GalvelicaThemeEditor } from "@/components/admin/galvelica-theme-editor"

export const dynamic = "force-dynamic"

export const metadata = { title: "副站主题色 · 管理后台" }

export default async function GalvelicaThemePage() {
  await requireSiteAdmin("galvelica")
  const color = await getGalvelicaThemeColor()

  return (
    <AdminPageContainer
      galvelica
      eyebrow="GALVELICA · THEME"
      title="副站主题色"
      description="独立于主站主题，仅作用于 Galvelica 副站（--gal-accent 主色）"
    >
      <GalvelicaThemeEditor initialColor={color} />
    </AdminPageContainer>
  )
}
