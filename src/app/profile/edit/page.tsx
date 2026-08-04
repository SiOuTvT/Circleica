import { BreadcrumbParentSetter } from "@/components/breadcrumb-setter"
import { ProfileEditForm } from "@/components/profile-edit-form"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serialIdToUid } from "@/lib/serial-id"
import { redirect } from "next/navigation"

export const metadata = { title: "编辑资料 · Circleica" }

export default async function ProfileEditPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile/edit")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, email: true, bio: true, avatar: true, banner: true, serialId: true, avatarFrameId: true },
  })
  if (!user) redirect("/login")

  const uid = serialIdToUid(user.serialId)

  return (
    <div>
      {/* 父级面包屑：从个人主页进入编辑资料时显示 首页 › xxx的主页 › 编辑资料 */}
      {/* 父级面包屑：从个人主页进入编辑资料时显示 首页 › xxx的主页 › 编辑资料。
          注意 href 用原始 serialId（与顶栏/规范 URL 一致），避免用补零 uid 导致 segment 不匹配、面包屑消失 */}
      <BreadcrumbParentSetter crumbs={[{ label: `${user.username} 的主页`, href: `/user/${user.serialId}` }]} />
      <ProfileEditForm user={{ ...user, uid, avatarFrameId: user.avatarFrameId ?? null }} />
    </div>
  )
}
