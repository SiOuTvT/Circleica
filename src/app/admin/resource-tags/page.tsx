import { requireSuperAdmin } from "@/lib/admin"
import { ResourceTagsClient } from "./resource-tags-client"

export const metadata = { title: "资源标签管理" }

export default async function AdminResourceTagsPage() {
  await requireSuperAdmin()
  return <ResourceTagsClient />
}
