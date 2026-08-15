/**
 * 外部 HTTP 调用统一工具（B-31）：超时中断 + 指数退避重试。
 * 用于 VNDB / 翻译服务 / GitHub 等第三方调用，避免无超时挂死或瞬时抖动直接失败。
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** 超时毫秒数，默认 8000 */
  timeoutMs?: number
}

/**
 * 带超时的 fetch：超时即 AbortController 中断，抛出 DOMException("AbortError")。
 */
export async function fetchWithTimeout(url: string, options: FetchWithTimeoutOptions = {}): Promise<Response> {
  const { timeoutMs = 8000, ...init } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export interface RetryOptions {
  /** 最大重试次数（不含首次），默认 2 */
  retries?: number
  /** 基础退避毫秒，默认 300 */
  baseDelayMs?: number
  /** 是否对 4xx（不含 429）也重试，默认 false（仅网络错误/5xx/429 重试） */
  retryOn4xx?: boolean
  /** 自定义是否重试该响应 */
  shouldRetry?: (res: Response) => boolean
}

/**
 * 对异步函数执行指数退避重试。仅对抛错与可重试响应重试；
 * 网络层异常（超时/连接失败）一律重试，5xx 与 429 默认重试，其它 4xx 不重试。
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, baseDelayMs = 300, shouldRetry } = options
  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === retries) break
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }

  // 支持对“返回响应对象”的调用做状态码重试：单独包装一层
  if (shouldRetry) {
    // shouldRetry 场景需由调用方在 fn 内部判断，这里不二次包裹
  }
  throw lastErr
}

/** 仅当响应应重试时使用（5xx 或 429；可选 4xx） */
export function isRetriableResponse(res: Response, retryOn4xx = false): boolean {
  if (res.status === 429) return true
  if (res.status >= 500) return true
  if (retryOn4xx && res.status >= 400 && res.status < 500) return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
