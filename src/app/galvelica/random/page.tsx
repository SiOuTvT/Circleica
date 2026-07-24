import { redirect } from "next/navigation"
import { getRandomWorkSerialId } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export default async function GalvelicaRandom() {
  const serialId = await getRandomWorkSerialId()
  if (!serialId) redirect("/galvelica")
  redirect(`/galvelica/works/${serialId}`)
}
