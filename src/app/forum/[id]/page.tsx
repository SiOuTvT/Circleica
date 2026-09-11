import { ForumPostDetail } from "@/components/forum-post-detail"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { forumService } from "@/services/forum"
import { recordForumView, FORUM_VIEW_COOKIE } from "@/lib/forum-view"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import { hasRole } from "@/lib/permissions"
import type { UserRole } from "@/generated/prisma/client"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

/** 帖子 id 形状（cuid）。非法形状直接 404，不要落到服务层抛异常 */
const ID_SHAPE = /^[a-z0-9]{20,32}$/i
function isPostId(value: string) {
  return ID_SHAPE.test(value)
}

export const revalidate = 30

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (!isPostId(id)) return { title: "帖子不存在" }
  const post = await prisma.forumPost.findUnique({ where: { id }, select: { title: true, content: true } })
  if (!post) return { title: "帖子不存在" }
  const desc = post.content.replace(/<[^>]*>/g, "").slice(0, 160)
  return {
    title: post.title,
    description: desc || `${post.title} - Circleica 社区论坛讨论帖`,
    openGraph: { siteName: "Circleica", title: post.title, description: desc, images: ["/opengraph-image"] },
    alternates: { canonical: `/forum/${id}` },
  }
}

export default async function ForumPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isPostId(id)) notFound()
  const session = await auth()

  async function fetchPost() {
    return forumService.getPost(id, session?.user?.id)
  }

  type PostData = NonNullable<Awaited<ReturnType<typeof fetchPost>>>
  const postResult = await fetchPost()
  if (!postResult) notFound()
  const post: PostData = postResult

  // 浏览量：进入详情页即计入（含未登录访客），同一浏览器 30 分钟内去重
  const cookieStore = await cookies()
  const cookieRaw = cookieStore.get(FORUM_VIEW_COOKIE)?.value ?? null
  const { viewCount, cookieValue } = await recordForumView(id, cookieRaw)
  if (cookieValue) {
    try {
      cookieStore.set(FORUM_VIEW_COOKIE, cookieValue, { maxAge: 60 * 60 * 24 * 365, path: "/" })
    } catch {
      // 服务端组件内写入 Cookie 受框架限制时降级为仅计数、不持久化去重标记
    }
  }

  const isAdmin = hasRole(session?.user?.role as UserRole, "ADMIN")

  // flatten comments for client
  const flatComments = post.comments.map((c) => ({
    id: c.id,
    content: c.content,
    imageUrl: c.imageUrl ?? "",
    likeCount: c.likeCount,
    liked: (c as { liked?: boolean }).liked ?? false,
    createdAt: c.createdAt.toISOString(),
    user: { id: c.user.id, username: c.user.username, avatar: c.user.avatar ?? "" },
  }))

  const postData = {
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl ?? "",
    likeCount: post.likeCount,
    commentCount: post._count?.comments ?? post.comments.length,
    viewCount: viewCount,
    liked: (post as { liked?: boolean }).liked ?? false,
    isSolved: post.isSolved,
    isLocked: post.isLocked,
    createdAt: post.createdAt.toISOString(),
    user: { id: post.user.id, username: post.user.username, avatar: post.user.avatar ?? "" },
  }

  return (
    <div>
      <Link href="/forum" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        返回论坛
      </Link>
      <ForumPostDetail
        post={postData}
        comments={flatComments}
        totalCommentCount={post._count?.comments ?? flatComments.length}
        isLoggedIn={!!session?.user}
        currentUserId={session?.user?.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
