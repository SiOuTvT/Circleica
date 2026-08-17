import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { hasRole } from "@/lib/permissions"
import type { UserRole } from "@/generated/prisma/client"

// uploadthing 的 onUploadComplete 回调里 `file` 的类型由 effect 的 S.Class 推导。
// 依赖树中 effect 存在多份版本（uploadthing 需 3.4.8、@effect/schema 需 3.22.1、
// @prisma/client 需 3.20.0），CI 用 npm install --legacy-peer-deps 重装时，
// uploadthing 的 effect 可能被解析/提升为顶层 3.22.1，导致该版本下推导出的
// UploadedFileData 实例类型不再把 url/name 暴露为公共字段（本地用嵌套 3.4.8 正常）。
// 这里用最小结构类型读取运行时必然存在的字段，避免依赖库内部类型推导的不确定性。
type UploadedFileShape = { url: string; name?: string }

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
      const { url } = file as unknown as UploadedFileShape
      return { url, userId: metadata.userId }
    }),

  // 通用图片上传：用于公告封面、游戏截图等，最大 8MB
  imageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("未登录")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      const { url } = file as unknown as UploadedFileShape
      return { url }
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
      if (!hasRole(user?.role as UserRole, "ADMIN")) throw new Error("无权限")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      const { url, name } = file as unknown as UploadedFileShape
      return { url, name }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
