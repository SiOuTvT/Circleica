import * as Sentry from "@sentry/nextjs"

/**
 * Edge 运行时异常采集。
 *
 * Edge 运行时不支持 NodeSDK / OpenTelemetry，因此 Sentry 在 Edge 端独立完成错误上报。
 * 服务端 / 客户端的 Trace 仍由 OpenTelemetry / Sentry 各自负责（见相应配置文件）。
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const release = process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION

Sentry.init({
  dsn,
  enabled: process.env.NODE_ENV === "production" && Boolean(dsn),
  release,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  integrations: [],
  debug: false,
})
