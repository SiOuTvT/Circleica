import { authService } from "@/services/user"
import Link from "next/link"
import { CircleCheck, CircleX } from "lucide-react"

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
      <div className="flex min-h-[100dvh] items-start justify-center px-4 pt-12 pb-12 sm:items-center sm:pt-0 sm:pb-0">
        <ResultCard
          status="error"
          title="验证链接无效"
          desc="缺少验证令牌，请检查邮件中的链接是否完整。"
        />
      </div>
    )
  }

  let result: { email?: string } | null = null
  let failed = false
  let message = "验证失败"
  try {
    if (type === "change_email") {
      result = await authService.confirmEmailChange(token)
    } else {
      result = await authService.verifyEmail(token)
    }
  } catch (error) {
    failed = true
    message = error instanceof Error ? error.message : "验证失败"
  }

  if (failed) {
    return (
      <div className="flex min-h-[100dvh] items-start justify-center px-4 pt-12 pb-12 sm:items-center sm:pt-0 sm:pb-0">
        <ResultCard
          status="error"
          title="验证失败"
          desc={message}
          showResend={message.includes("过期")}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-start justify-center px-4 pt-12 pb-12 sm:items-center sm:pt-0 sm:pb-0">
      <ResultCard
        status="success"
        title={type === "change_email" ? "邮箱变更成功" : "邮箱验证成功"}
        desc={
          type === "change_email"
            ? `你的邮箱已更新为 ${result?.email}`
            : "你的邮箱已验证，现在可以正常使用所有功能。"
        }
      />
    </div>
  )
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
    <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center space-y-4 ring-1 ring-foreground/10 shadow-1">
      <div className="flex justify-center">
        {status === "success"
          ? <CircleCheck className="h-12 w-12 text-[var(--success)]" strokeWidth={1.5} />
          : <CircleX className="h-12 w-12 text-[var(--error)]" strokeWidth={1.5} />}
      </div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="flex flex-col gap-2 pt-2">
        {showResend && (
          // 复用 globals.css 触控热区档：[role="link"] ⇒ 触屏端自动 ≥44×44
          <Link
            href="/login"
            role="link"
            className="inline-flex items-center justify-center h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition duration-150 ease-in-out"
          >
            重新发送验证邮件
          </Link>
        )}
        {/* 复用 globals.css 触控热区档：[role="link"] ⇒ 触屏端自动 ≥44×44 */}
        <Link
          href="/"
          role="link"
          className="inline-flex items-center justify-center h-10 rounded-xl bg-secondary text-foreground text-sm font-medium ring-1 ring-border hover:ring-primary/40 transition duration-150 ease-in-out"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
