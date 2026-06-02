import { BreadcrumbParentSetter } from "@/components/breadcrumb-setter"
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

  const uid = serialIdToUid(user.serialId)

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      {/* 父级面包屑：从个人主页进入编辑资料时显示 首页 › xxx的主页 › 编辑资料 */}
      <BreadcrumbParentSetter crumbs={[{ label: `${user.username} 的主页`, href: `/user/${uid}` }]} />
      <h1 className="mb-6 text-lg font-bold text-zinc-100 light:text-zinc-900">编辑资料</h1>
      <ProfileEditForm user={{ ...user, uid }} />
    </div>
  )
}
