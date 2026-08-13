import * as Sentry from "@sentry/nextjs"

/**
 * 服务端 / RSC / Route Handler 异常采集。
 *
 * 设计：服务端只让 Sentry 负责「错误聚合」，Trace / Metrics / Logs 统一交给
 * OpenTelemetry（见 src/instrumentation-otel.ts + src/otel-node.ts）→ Grafana。
 * skipOpenTelemetrySetup 复用本项目已启动的 OTel 管线，避免两套 Trace 互相冲突。
 * 错误与 Trace 的关联在 api-handler 中手动注入 trace_id（见 src/lib/api-handler.ts）。
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const release = process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION

Sentry.init({
  dsn,
  enabled: process.env.NODE_ENV === "production" && Boolean(dsn),
  release,
  environment: process.env.NODE_ENV,
  // 服务端 Trace 交给 OpenTelemetry → Tempo，这里关闭 Sentry 自带 tracing 避免重复
  tracesSampleRate: 0,
  // 关键：不重复初始化 OpenTelemetry，复用 instrumentation-otel.ts 启动的 OTel 管线
  skipOpenTelemetrySetup: true,
  integrations: [],
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
  ],
  debug: false,
})
