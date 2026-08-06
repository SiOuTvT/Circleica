import { requireSiteAdmin } from "@/lib/auth-context"
import { AdminPageContainer } from "@/components/admin-page-container"
import { GalvelicaFetchClient } from "./fetch-client"

export const metadata = { title: "副站手动拉取 · Galvelica" }

export default async function GalvelicaFetchPage() {
  await requireSiteAdmin("galvelica")

  return (
    <AdminPageContainer
      eyebrow="GALVELICA"
      title="手动拉取"
      description="从外部资料源（VNDB / ErogameScape 等）按作品 ID 拉取并写入 Galvelica 资料馆。国内源（CnGal / 月幕 / Bangumi）按策略默认锁定。拉取受时长与数量上限约束，重复作品自动跳过。"
    >
      <GalvelicaFetchClient />
    </AdminPageContainer>
  )
}
