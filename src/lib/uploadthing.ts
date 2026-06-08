import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createUploadthing, type FileRouter } from "uploadthing/next"

const f = createUploadthing()

export const ourFileRouter = {
  // 头像上传：最大 4MB 图片
  avatar: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("未登录")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, userId: metadata.userId }
    }),

  // 通用图片上传：用于公告封面、游戏截图等，最大 8MB
  imageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("未登录")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),

  // 音乐上传：管理员专用，最大 32MB
  music: f({ audio: { maxFileSize: "32MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("未登录")
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") throw new Error("无权限")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, name: file.name }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
