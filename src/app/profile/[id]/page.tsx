import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"

/**
 * 旧路由兼容重定向：
 *   /profile/[cuid] → /user/[serialId]
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { username: true, bio: true, serialId: true } })
  if (user) {
    const description = user.bio?.replace(/<[^>]+>/g, "").slice(0, 160) || `${user.username} 的个人主页`
    return {
      title: `${user.username} · Circleica`,
      description,
      openGraph: { title: `${user.username} · Circleica`, description, images: ["/opengraph-image"] },
      alternates: { canonical: `/user/${user.serialId}` },
    }
  }
  return {
    title: "用户主页",
    description: "查看用户主页",
    openGraph: { title: "用户主页 · Circleica", description: "查看用户主页", images: ["/opengraph-image"] },
    alternates: { canonical: "/user/" },
  }
}

export default async function ProfileRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 这个路由只处理 cuid 格式（由 middleware 拦截数字格式后调转到 /user/[id]）
  const user = await prisma.user.findUnique({
    where: { id },
    select: { serialId: true },
  })

  if (!user) notFound()

  // 308 永久重定向到新的 /user/[serialId] 路由
  redirect(`/user/${user.serialId}`)
}
