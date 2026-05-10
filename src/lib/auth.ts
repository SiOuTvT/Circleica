import { prisma } from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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
          image: user.avatar || null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id    = user.id
        token.name  = user.name
        token.image = user.image
        // 从数据库读取头像框
        const dbUser = await prisma.user.findUnique({ where: { id: user.id! } })
        token.avatarFrame = (dbUser as any)?.avatarFrame ?? "none"
      }
      // 用户更新后刷新 session
      if (trigger === "update" && session) {
        if (session.image) token.image = session.image
        if (session.avatarFrame) token.avatarFrame = session.avatarFrame
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id          = token.id as string
        session.user.name        = token.name
        session.user.image       = token.image as string | null
        ;(session.user as any).avatarFrame = (token as any).avatarFrame ?? "none"
      }
      return session
    },
  },
})
