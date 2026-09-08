import { requireSuperAdmin } from "@/lib/admin"
import { ThemeSettingsClient } from "./theme-client"

export const metadata = { title: "主题设置" }

export default async function AdminThemePage() {
  await requireSuperAdmin()
  return <ThemeSettingsClient />
}
