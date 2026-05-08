import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // 仅在生产环境启用
  enabled: process.env.NODE_ENV === "production",
  
  // 性能监控采样率
  tracesSampleRate: 0.1,
  
  // 调试模式
  debug: false,
  
  // 环境
  environment: process.env.NODE_ENV,
})