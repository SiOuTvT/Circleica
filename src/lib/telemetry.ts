/**
 * 轻量遥测封装（OpenTelemetry 客户端 API 层）
 *
 * 设计要点：
 * - 仅依赖 @opentelemetry/api（纯 JS、跨运行时安全），不引入任何 NodeSDK 重依赖。
 * - 真正的 SDK / 导出器在 src/instrumentation-otel.ts 按需加载，
 *   仅当配置了 OTEL_EXPORTER_OTLP_ENDPOINT 时才启动。
 * - 降级语义：若未启动 OTel SDK，tracer / meter 为 no-op，
 *   所有 span / metric 调用自动失效，不影响任何业务逻辑。
 *
 * Trace → Tempo；Metrics → Prometheus（经 OTel Collector）；Logs → Loki。
 */

import { trace, metrics, context as otelContext, SpanStatusCode, type Span } from "@opentelemetry/api"

const TRACER_NAME = "circleica"
const METER_NAME = "circleica"

export const tracer = trace.getTracer(TRACER_NAME)
const meter = metrics.getMeter(METER_NAME)

let _requests: ReturnType<typeof meter.createCounter> | null = null
let _errors: ReturnType<typeof meter.createCounter> | null = null
let _duration: ReturnType<typeof meter.createHistogram> | null = null

function ensureMetrics() {
  if (_requests) return
  _requests = meter.createCounter("circleica_http_requests_total", {
    description: "Total HTTP requests handled by the app (by method/status)",
  })
  _errors = meter.createCounter("circleica_http_errors_total", {
    description: "Total handled errors (5xx / thrown) by coarse code",
  })
  _duration = meter.createHistogram("circleica_http_request_duration_ms", {
    description: "HTTP request duration in milliseconds",
    unit: "ms",
  })
}

/**
 * 开启一个 span 并将其设为「当前活跃 span」，使 logger 能自动关联 trace_id，
 * 并使自动插桩的下游调用（Prisma/Upstash Redis/fetch）正确嵌套为子 span。
 */
export async function withActiveSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan(name, { attributes })
  const ctx = trace.setSpan(otelContext.active(), span)
  try {
    return await otelContext.with(ctx, () => fn(span))
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    })
    span.recordException(err as Error)
    throw err
  } finally {
    span.end()
  }
}

export function recordRequest(method: string, status: number, durationMs: number) {
  ensureMetrics()
  const attrs = { method, status: String(status) }
  _requests!.add(1, attrs)
  _duration!.record(durationMs, attrs)
}

export function recordError(code: string) {
  ensureMetrics()
  _errors!.add(1, { code })
}

/**
 * 读取当前活跃 span 的 trace 上下文，用于把 Sentry 异常与 OTel Trace 双向关联。
 * 未启用监控时返回空对象。
 */
export function getActiveTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan()
  if (!span) return {}
  const ctx = span.spanContext()
  return { traceId: ctx.traceId, spanId: ctx.spanId }
}
