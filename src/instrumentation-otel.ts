/**
 * OpenTelemetry 引导（按需加载）
 *
 * 仅在配置了 OTEL_EXPORTER_OTLP_ENDPOINT 时启动采集；否则完全不加载任何 OTel SDK，
 * 实现「未配置监控服务时的合理降级」。开发环境（无该变量）同样跳过。
 *
 * 真正的重依赖（@opentelemetry/sdk-node 等）放在 ./otel-node，由本文件的动态 import 引入，
 * 避免拖慢未启用监控时的启动与构建。
 */
import { logger } from "@/lib/logger"

export async function initOtel() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) {
    // 未配置监控时的合理降级：仅记录一条提示，不加载任何 OTel SDK
    logger.system.info("OTEL_EXPORTER_OTLP_ENDPOINT 未配置，跳过 OpenTelemetry 采集（无监控降级模式）")
    return
  }
  try {
    const { startOtel } = await import("./otel-node")
    await startOtel()
    logger.system.info(`OpenTelemetry 已启动，导出到 ${endpoint}`)
  } catch (err) {
    // 监控不可用绝不能拖垮业务
    logger.system.error("OpenTelemetry 启动失败，已降级为无监控模式", {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
