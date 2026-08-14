/**
 * 客户端安全的 API 响应解析（从 api-handler.ts 拆离）。
 *
 * 本模块刻意不导入任何 server-only 依赖（request-context / node:async_hooks /
 * next/server 等），以便 "use client" 组件安全引用，而不触发
 * `server-only` 被打包进浏览器 bundle 的构建期报错。
 *
 * 服务端代码仍应从 api-handler.ts 导入（含 withHandler / json / safeParseJson 等）。
 */
export function parseApiResponse<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data
  }
  return json as T
}
