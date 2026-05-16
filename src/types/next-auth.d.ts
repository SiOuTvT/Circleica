import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    avatarFrame?: string
    role?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      image: string | null
      avatarFrame: string
      role: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    avatarFrame?: string
  }
}
