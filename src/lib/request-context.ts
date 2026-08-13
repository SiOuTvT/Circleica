/**
 * 请求级上下文（服务端专属）
 *
 * 用 AsyncLocalStorage 把每个请求的 requestId / route 传递下去，
 * 让 logger 能在不污染客户端打包的前提下，给每条日志打上「属于哪个请求」的标签。
 *
 * 该模块仅供服务端代码（api-handler 等）导入；标记为 server-only，
 * 防止被打包进浏览器 bundle。logger.ts 通过 globalThis 上的 getter 读取，
 * 因此 logger 本身不依赖本模块、可安全用于客户端。
 */
import "server-only"
import { AsyncLocalStorage } from "node:async_hooks"

export interface RequestContext {
  requestId: string
  route: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(ctx, fn)
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}

// 注册到 globalThis，供 logger.ts 读取（避免 logger 必须导入 server-only 模块）
;(globalThis as Record<string, unknown>).__circleicaGetRequestCtx = getRequestContext
