import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // 仅在生产环境启用
  enabled: process.env.NODE_ENV === "production",
  
  // 性能监控采样率（100% = 全部采集）
  tracesSampleRate: 0.1,
  
  // 会话回放采样率
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  
  // 调试模式
  debug: false,
  
  // 集成
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // 忽略常见非错误
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "Network request failed",
    "NetworkError",
    "Failed to fetch",
  ],
  
  // 环境
  environment: process.env.NODE_ENV,
})