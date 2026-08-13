/**
 * OpenTelemetry NodeSDK 实际启动（仅在配置了 OTLP 端点时被动态加载）
 *
 * 采集三大信号，统一经 OTLP 导出到 OTel Collector：
 *   - Trace   → Tempo（链路追踪）
 *   - Metrics → Prometheus（经 Collector 的 prometheus exporter 拉取）
 *   - Logs    → Loki（结构化日志聚合）
 *
 * 自动插桩覆盖：HTTP（入站请求 / 出站 fetch）、PostgreSQL（经 Prisma）、
 * Upstash Redis（基于 undici 的 fetch 调用）、DNS 等。
 *
 * 多实例就绪：所有实例把遥测打到同一个 Collector，由 Collector 聚合后落库，
 * 实例本身无状态、可水平扩容。
 */

import { NodeSDK } from "@opentelemetry/sdk-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { logs, SeverityNumber, type Logger as OtelLogger } from "@opentelemetry/api-logs"
import { resourceFromAttributes, type Resource } from "@opentelemetry/resources"
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { PrismaInstrumentation } from "@prisma/instrumentation"
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici"
import { trace, context as otelContext } from "@opentelemetry/api"

function parseHeaders(raw?: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw) return out
  for (const pair of raw.split(",")) {
    const idx = pair.indexOf("=")
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return out
}

const SEVERITY: Record<string, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
}

export async function startOtel() {
  const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "").replace(/\/$/, "")
  const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
  const serviceName = process.env.OTEL_SERVICE_NAME || "circleica"
  const version = process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION || "dev"
  const deploymentEnv = process.env.NODE_ENV || "production"

  const resource: Resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: deploymentEnv,
  })

  const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers })
  const metricExporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics`, headers })
  const logExporter = new OTLPLogExporter({ url: `${endpoint}/v1/logs`, headers })

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  })

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    // 默认采样（ParentBased(AlwaysOn)）已满足本站规模；不自定义采样器以免版本耦合
    instrumentations: [
      getNodeAutoInstrumentations({
        // 关闭与 Next.js 框架运行时容易冲突的少数项，其余保持默认开启
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
      new PrismaInstrumentation(),
      new UndiciInstrumentation({ enabled: true }),
    ],
  })

  await sdk.start()

  // 日志：NodeSDK 不内置 logs，单独建 LoggerProvider（处理器在构造函数中注入），导出到同一 OTLP 端点 → Loki
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor({ exporter: logExporter })],
  })
  logs.setGlobalLoggerProvider(loggerProvider)

  const otelLogger: OtelLogger = loggerProvider.getLogger("circleica")

  // 供 logger.ts 推送结构化日志（logger 不导入 server-only / OTel 依赖，仅通过 globalThis 回调）
  ;(globalThis as Record<string, unknown>).__circleicaLogSink = (rec: {
    severityText: string
    body: string
    attributes: Record<string, unknown>
  }) => {
    try {
      otelLogger.emit({
        severityNumber: SEVERITY[rec.severityText] ?? SeverityNumber.INFO,
        severityText: rec.severityText,
        body: rec.body,
        attributes: rec.attributes,
        context: otelContext.active(),
      })
    } catch {
      /* 监控失败绝不能影响业务日志 */
    }
  }

  // 供 logger.ts 关联当前 Trace（错误 ↔ Trace 双向关联）
  ;(globalThis as Record<string, unknown>).__circleicaTraceCtx = () => {
    const span = trace.getActiveSpan()
    if (!span) return {}
    const c = span.spanContext()
    return { traceId: c.traceId, spanId: c.spanId }
  }
}
