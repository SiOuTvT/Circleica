import { requireSuperAdmin } from "@/lib/admin"
import { AvatarFramesClient } from "./avatar-frames-client"

export const metadata = { title: "头像框管理" }

export default async function AdminAvatarFramesPage() {
  await requireSuperAdmin()
  return <AvatarFramesClient />
}
