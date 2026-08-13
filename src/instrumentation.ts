/**
 * Next.js Instrumentation Hook
 *
 * 作用：@sentry/nextjs v8+ 起，`sentry.server.config.ts` / `sentry.edge.config.ts`
 * 不再被框架自动加载，必须由本文件的 `register()` 按 runtime 动态 import 才会执行。
 * 缺少本文件 = 服务端 / Edge 的 Sentry SDK 从未 init（客户端配置不受影响）。
 *
 * 同时导出 `onRequestError`，用于捕获 App Router 的服务端渲染 / RSC / Route Handler 错误，
 * 这类错误不会经过客户端的 global-error 边界，只能在此上报。
 *
 * 约定：与 `next.config.ts` 的 withSentry 保持一致 —— 开发环境完全不 import
 * `@sentry/nextjs`，避免加载 OpenTelemetry 等重依赖拖慢 dev 启动。
 */

import type { Instrumentation } from "next"

export async function register() {
  // ── OpenTelemetry（日志/指标/Trace 统一开放标准）──
  // 仅在配置了 OTLP 端点时启动采集；否则 instrumentation-otel 内部自动跳过，
  // 实现「未配置监控服务时的合理降级」。开发环境同样跳过（无该变量）。
  const { initOtel } = await import("./instrumentation-otel")
  await initOtel()

  // ── Sentry（前端错误 / RUM / 性能 + 服务端异常采集）──
  // 仅生产 + 配置了 DSN 时启用；否则 SDK 静默禁用。
  if (process.env.NODE_ENV === "development") return

  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // 未配置 DSN 时 SDK 会静默禁用，这里显式提示，避免"以为在监控其实全盲"
    console.warn(
      "[sentry] DSN 未配置，错误监控未启用（如需启用请设置 SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN）",
    )
    return
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (process.env.NODE_ENV === "development") return
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return

  const { captureRequestError } = await import("@sentry/nextjs")
  return captureRequestError(...args)
}
