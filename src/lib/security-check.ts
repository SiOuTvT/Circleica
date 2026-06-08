/**
 * 启动时安全检查
 * 在开发环境检测弱密码等安全问题并输出警告
 */
import { logger } from "./logger"

const WEAK_SECRETS = [
  "local-dev-secret-key-for-fangame",
  "your-secret-key-here",
  "change-me",
  "secret",
  "password",
]

const WEAK_DB_PASSWORDS = [
  "fangame2024",
  "password",
  "123456",
  "root",
  "admin",
]

export function checkSecurity() {
  if (process.env.NODE_ENV !== "development") return

  const issues: string[] = []

  // 检查 NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET || ""
  if (WEAK_SECRETS.includes(secret.toLowerCase())) {
    issues.push("NEXTAUTH_SECRET 使用了弱密钥，生产环境请运行: openssl rand -base64 32")
  }
  if (secret.length < 32) {
    issues.push(`NEXTAUTH_SECRET 长度不足（当前 ${secret.length} 字符，建议 ≥32）`)
  }

  // 检查数据库密码
  const dbUrl = process.env.DATABASE_URL || ""
  const passwordMatch = dbUrl.match(/postgresql:\/\/[^:]+:([^@]+)@/)
  if (passwordMatch) {
    const dbPassword = passwordMatch[1]
    if (WEAK_DB_PASSWORDS.includes(dbPassword.toLowerCase())) {
      issues.push("数据库使用了弱密码，生产环境请更换强密码")
    }
  }

  // 检查 NEXTAUTH_URL
  const url = process.env.NEXTAUTH_URL || ""
  if (url.startsWith("http://") && !url.includes("localhost")) {
    issues.push("NEXTAUTH_URL 使用 HTTP 而非 HTTPS，生产环境请使用 HTTPS")
  }

  if (issues.length > 0) {
    logger.db.warn("安全警告", { issues: issues.join("; ") })
  }
}
