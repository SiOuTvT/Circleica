import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

// 全局类型声明：扩展 JWT 和 Session 类型
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email?: string | null
      image?: string | null
      avatarFrame: string
    }
  }
}

declare module "next-auth" {
  interface JWT {
    id?: string
    name?: string
  }
}

// 注意：不使用 PrismaAdapter。
// PrismaAdapter 用于 OAuth provider（GitHub/Google 等）需要数据库存储 account/session 的场景。
// 我们只用 Credentials + JWT 策略，不需要 Adapter。
// 使用 Adapter 配合 JWT 策略会导致 NextAuth 尝试创建数据库 session 记录并设置额外的 cookies，
// 增加请求头大小，最终触发 HTTP 431 错误。

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // 不使用 adapter，纯 Credentials + JWT
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "用户名或邮箱" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string
        const password = credentials?.password as string
        if (!identifier || !password) return null

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: identifier }, { email: identifier }],
          },
        })
        if (!user) return null
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          image: user.avatar ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id   = user.id
        token.name = user.name
        // 注意：image 和 avatarFrame 都不放入 JWT，避免 cookie 过大触发 431 错误
        // 改为在 session 回调中实时查询数据库
      }
      // 用户更新后刷新 session
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name
        // image 不存入 JWT，所以不需要从 session 中获取
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string
        session.user.name = token.name ?? ""
        // 实时从数据库读取 image 和 avatarFrame，避免存入 JWT 增大 cookie
        try {
          if (token.id) {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { avatar: true, avatarFrame: true },
            })
            session.user.image = dbUser?.avatar ?? null
            session.user.avatarFrame = dbUser?.avatarFrame ?? "none"
          } else {
            session.user.image = null
            session.user.avatarFrame = "none"
          }
        } catch {
          session.user.image = null
          session.user.avatarFrame = "none"
        }
      }
      return session
    },
  },
})
