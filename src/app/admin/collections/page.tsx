import { requireAdmin } from "@/lib/admin"
import { CollectionsClient } from "./collections-client"

export const metadata = { title: "精选合集" }

export default async function AdminCollectionsPage() {
  await requireAdmin()
  return <CollectionsClient />
}
