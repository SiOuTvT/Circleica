import { requireSuperAdmin } from "@/lib/admin"
import { ServicesClient } from "./services-client"

export const metadata = { title: "服务配置" }

export default async function AdminServicesPage() {
  await requireSuperAdmin()
  return <ServicesClient />
}
