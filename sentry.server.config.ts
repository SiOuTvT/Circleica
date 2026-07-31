import * as Sentry from "@sentry/nextjs"

Sentry.init({
  // 允许只配一个 DSN：优先服务端专用变量，回退到公共变量
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 仅在生产环境启用
  enabled: process.env.NODE_ENV === "production",
  
  // 性能监控采样率
  tracesSampleRate: 0.1,
  
  // 调试模式
  debug: false,
  
  // 环境
  environment: process.env.NODE_ENV,
})