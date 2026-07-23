import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { unstable_cache } from "next/cache"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getRateLimit, getClientIP, rateLimits } from "@/lib/rate-limit"

// 请求级缓存：同一请求内多次 auth() 调用只查一次 DB
const getCachedUser = unstable_cache(
  async (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: { avatar: true, avatarFrameId: true, serialId: true, composedAvatarUrl: true, role: true, emailVerified: true },
    })
  },
  ["session-user"],
  { revalidate: 30, tags: ["session-user"] }
)

// 全局类型声明：扩展 JWT 和 Session 类型
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      serialId: number
      name: string
      email?: string | null
      image?: string | null
      avatarFrame: string
      composedAvatarUrl: string | null
      role: string
      isEmailVerified: boolean
    }
  }
}

declare module "next-auth" {
  interface JWT {
    id?: string
    name?: string
    role?: string
    isEmailVerified?: boolean
  }
}

const isSecure =
  process.env.NODE_ENV === "production" ||
  process.env.NEXTAUTH_URL?.startsWith("https://") === true

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
  // 更换 cookie 名称：旧 cookie 中残留了过大的 JWT 数据导致 431 错误
  // 使用新名称后浏览器会自动创建全新的、更小的 cookie
  cookies: {
    sessionToken: {
      name: "fangame-session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecure, // 根据 NEXTAUTH_URL 自动判断是否需要 secure
      },
    },
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
      async authorize(credentials, request) {
        // 登录限流（M16）：基于客户端 IP 限制尝试频率，防止凭证暴力破解
        const ip = getClientIP(request?.headers ?? new Headers())
        const rl = await getRateLimit(`auth:${ip}`, rateLimits.auth)
        if (!rl.allowed) return null

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

        // 检查邮箱验证要求
        if (!user.emailVerified) {
          const setting = await prisma.siteSetting.findUnique({
            where: { key: "email_verification_required_for_login" },
            select: { value: true },
          })
          if (setting?.value === "true") {
            return null
          }
        }

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          image: user.avatar ?? null,
          role: user.role,
          emailVerified: user.emailVerified,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id   = user.id
        token.name = user.name
        token.role = (user as Record<string, unknown>).role as string
        token.isEmailVerified = (user as Record<string, unknown>).emailVerified as boolean
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
        // 实时从数据库读取 avatar/role 等，避免存入 JWT 增大 cookie；
        // role / emailVerified 以数据库为准（getCachedUser 已 30s 缓存），
        // 避免管理员改角色 / 邮箱验证后旧 JWT 仍生效（stale permission，最迟 30s 收敛）
        let dbUser = null as Awaited<ReturnType<typeof getCachedUser>> | null
        try {
          if (token.id) dbUser = await getCachedUser(token.id as string)
        } catch {
          dbUser = null
        }
        session.user.role = dbUser?.role ?? (token.role as string) ?? "USER"
        session.user.isEmailVerified = dbUser?.emailVerified ?? (token.isEmailVerified as boolean) ?? false
        session.user.image = dbUser?.avatar ?? null
        session.user.avatarFrame = dbUser?.avatarFrameId ?? "none"
        session.user.serialId = dbUser?.serialId ?? 0
        session.user.composedAvatarUrl = dbUser?.composedAvatarUrl ?? null
      }
      return session
    },
  },
})
