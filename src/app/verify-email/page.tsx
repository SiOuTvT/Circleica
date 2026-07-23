import { authService } from "@/services/user"
import Link from "next/link"

export const metadata = {
  title: "邮箱验证",
  robots: { index: false, follow: false },
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; type?: string }>
}) {
  const sp = await searchParams
  const token = sp.token
  const type = sp.type || "verify"

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ResultCard
          status="error"
          title="验证链接无效"
          desc="缺少验证令牌，请检查邮件中的链接是否完整。"
        />
      </div>
    )
  }

  try {
    if (type === "change_email") {
      const result = await authService.confirmEmailChange(token)
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <ResultCard
            status="success"
            title="邮箱变更成功"
            desc={`你的邮箱已更新为 ${result.email}`}
          />
        </div>
      )
    }

    const result = await authService.verifyEmail(token)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ResultCard
          status="success"
          title="邮箱验证成功"
          desc="你的邮箱已验证，现在可以正常使用所有功能。"
        />
      </div>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "验证失败"
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ResultCard
          status="error"
          title="验证失败"
          desc={message}
          showResend={message.includes("过期")}
        />
      </div>
    )
  }
}

function ResultCard({
  status,
  title,
  desc,
  showResend,
}: {
  status: "success" | "error"
  title: string
  desc: string
  showResend?: boolean
}) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-card border border-border p-8 text-center space-y-4 shadow-3">
      <div className="text-4xl">{status === "success" ? "✅" : "❌"}</div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="flex flex-col gap-2 pt-2">
        {showResend && (
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
          >
            重新发送验证邮件
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 rounded-xl bg-secondary text-foreground text-sm font-medium ring-1 ring-border hover:ring-primary/40 transition-all"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
