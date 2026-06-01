import { ProfileEditForm } from "@/components/profile-edit-form"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serialIdToUid } from "@/lib/serial-id"
import { redirect } from "next/navigation"

export const metadata = { title: "编辑资料 · 同人游戏站" }

export default async function ProfileEditPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, bio: true, avatar: true, banner: true, serialId: true },
  })
  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <h1 className="mb-6 text-lg font-bold text-zinc-100">编辑资料</h1>
      <ProfileEditForm user={{ ...user, uid: serialIdToUid(user.serialId) }} />
    </div>
  )
}
