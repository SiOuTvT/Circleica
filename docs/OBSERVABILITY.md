# 可观测性

Circleica 的可观测由 Sentry（错误）与 OpenTelemetry（Trace / Metric）组成。两者都是**配置才启用**：缺少对应凭证时静默降级，不会因遥测缺失而导致应用报错或变慢。

## Sentry（错误监控）

- 仅在 `NODE_ENV=production` 且配置了 `SENTRY_DSN` 时初始化；否则不加载 SDK。
- 初始化失败会降级为 no-op，不影响业务。
- 接口边界（`api-handler`）在捕获异常时带上请求 `trace id`，便于和日志串联。
- 生产 sourcemap：构建期由 webpack 插件生成并上传到 Sentry，上传后立即删除，**不对外公开**，避免源码泄漏。

## OpenTelemetry（Trace / Metric）

- 仅在配置了 `OTEL_EXPORTER_OTLP_ENDPOINT` 时启用导出；否则为无操作实现。
- Trace 覆盖关键请求路径，Metric 包含接口耗时、缓存命中、限流触发等。
- 导出目标通常是 OTLP Collector（可接 Prometheus / Grafana）。

## 收集与不收集

- 收集：错误堆栈（脱敏）、请求路径、耗时、应用版本、地区（由代理头推断）。
- 不收集：用户明文密码、会话令牌、Cookie 内容、请求体中的敏感字段。接口对外报错统一为通用提示，敏感细节只进 Sentry 且按 DSN 权限控制。

## 查看

- 错误：Sentry 项目面板，按 release 与 sourcemap 定位到具体代码行。
- 指标 / 链路：Grafana（接 Collector 数据）。

## 部署注意

Sentry 与 OTel 的凭证属于部署环境配置，不在代码里硬编码。缺失时应用照常运行，只是少了遥测能力。
