import { requireSuperAdmin } from "@/lib/admin"
import { AchievementsClient } from "./achievements-client"

export const metadata = { title: "成就管理" }

export default async function AdminAchievementsPage() {
  await requireSuperAdmin()
  return <AchievementsClient />
}
