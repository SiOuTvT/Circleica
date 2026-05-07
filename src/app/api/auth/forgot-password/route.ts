import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // 速率限制：每小时最多3次密码重置请求
  const rateLimit = await checkRateLimit(RATE_LIMITS.passwordReset)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      }
    )
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: "请输入邮箱" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })

  // 不管用户存不存在都返回同样的提示，防止枚举
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // 删除旧令牌
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  // 生成新令牌，1小时有效
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // 发送邮件（如果配置了 Resend）
  if (process.env.RESEND_API_KEY) {
    try {
      // 动态导入 resend，仅在运行时执行
      const resendModule = await import("resend")
      const resendClient = new resendModule.Resend(process.env.RESEND_API_KEY)
      
      await resendClient.emails.send({
        from: process.env.EMAIL_FROM || "noreply@fangame.com",
        to: user.email,
        subject: "重置你的密码 - 同人游戏站",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">密码重置请求</h2>
            <p>你好，${user.username}！</p>
            <p>我们收到了重置你账户密码的请求。点击下面的按钮来重置密码：</p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #ec4899; color: white; 
                      text-decoration: none; border-radius: 8px; margin: 20px 0;">
              重置密码
            </a>
            <p style="color: #666; font-size: 14px;">或者复制以下链接到浏览器：</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">
              如果你没有请求重置密码，请忽略此邮件。<br/>
              此链接将在 1 小时后过期。
            </p>
          </div>
        `,
      })
      console.log(`[密码重置邮件] 已发送至 ${user.email}`)
    } catch (error) {
      console.error("[密码重置邮件] 发送失败:", error)
      // 即使邮件发送失败，也返回成功（安全考虑）
    }
  } else {
    // 开发环境：在控制台打印链接
    console.log(`[密码重置] ${user.email} → ${resetUrl}`)
  }

  return NextResponse.json({ ok: true })
}
