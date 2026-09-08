import { requireSuperAdmin } from "@/lib/admin"
import { SiteSettingsClient } from "./site-settings-client"

export const metadata = { title: "站点设置" }

export default async function AdminSiteSettingsPage() {
  await requireSuperAdmin()
  return <SiteSettingsClient />
}
