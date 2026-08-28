import type { Metadata } from "next"
import LoginPage from "./login-page"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ tab?: string }> }): Promise<Metadata> {
  const { tab } = await searchParams
  return { title: tab === "register" ? "注册" : "登录" }
}

export default function Page() {
  return <LoginPage />
}
