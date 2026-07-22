/**
 * 通用 API 客户端 — 带超时、重试、错误分类
 *
 * 用法：
 *   const data = await apiClient<User>("/api/user")
 *   const data = await apiClient<User>("/api/user", { method: "POST", body: { name: "test" } })
 */

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

interface ApiClientOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  /** 请求超时（毫秒），默认 15000 */
  timeout?: number
  /** 最大重试次数（仅 5xx / 网络错误重试），默认 0 */
  retries?: number
  /** 重试间隔基数（毫秒），默认 1000，指数退避 */
  retryDelay?: number
  /** AbortSignal（外部取消） */
  signal?: AbortSignal
}

function getErrorMessage(status: number): string {
  if (status === 401) return "请先登录"
  if (status === 403) return "没有权限"
  if (status === 404) return "内容不存在"
  if (status === 409) return "数据冲突"
  if (status === 429) return "操作太频繁，请稍后再试"
  if (status >= 500) return "服务器繁忙，请稍后再试"
  return `请求失败 (${status})`
}

function getErrorCode(status: number): string {
  if (status === 401) return "UNAUTHORIZED"
  if (status === 403) return "FORBIDDEN"
  if (status === 404) return "NOT_FOUND"
  if (status === 409) return "CONFLICT"
  if (status === 429) return "RATE_LIMITED"
  if (status >= 500) return "SERVER_ERROR"
  return "REQUEST_ERROR"
}

export async function apiClient<T = unknown>(
  url: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const {
    body,
    timeout = 15000,
    retries = 0,
    retryDelay = 1000,
    signal,
    headers: customHeaders,
    ...rest
  } = options

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  }

  let fetchBody: string | undefined
  if (body !== undefined) {
    fetchBody = JSON.stringify(body)
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json"
    }
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    // 每次重试创建新的 AbortController，合并外部 signal
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 如果外部有 signal，监听其 abort
    const onExternalAbort = () => controller.abort()
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId)
        throw new ApiError("请求已取消", 0, "ABORTED")
      }
      signal.addEventListener("abort", onExternalAbort, { once: true })
    }

    try {
      const response = await fetch(url, {
        ...rest,
        method: rest.method || "GET",
        headers,
        body: fetchBody,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      if (signal) signal.removeEventListener("abort", onExternalAbort)

      if (!response.ok) {
        const isRetryable = response.status >= 500
        const message = getErrorMessage(response.status)
        const code = getErrorCode(response.status)

        // 尝试解析后端自定义错误信息
        try {
          const errBody = await response.json()
          if (errBody.error || errBody.message) {
            const err = new ApiError(
              errBody.error || errBody.message || message,
              response.status,
              errBody.code || code,
            )
            if (isRetryable && attempt < retries) {
              lastError = err
              await delay(retryDelay * Math.pow(2, attempt))
              continue
            }
            throw err
          }
        } catch (parseErr) {
          if (parseErr instanceof ApiError) throw parseErr
        }

        const err = new ApiError(message, response.status, code)
        if (isRetryable && attempt < retries) {
          lastError = err
          await delay(retryDelay * Math.pow(2, attempt))
          continue
        }
        throw err
      }

      // 204 No Content
      if (response.status === 204) return undefined as T

      return (await response.json()) as T
    } catch (err) {
      clearTimeout(timeoutId)
      if (signal) signal.removeEventListener("abort", onExternalAbort)

      if (err instanceof ApiError) throw err

      // AbortError (timeout or external abort)
      if (err instanceof DOMException && err.name === "AbortError") {
        if (signal?.aborted) {
          throw new ApiError("请求已取消", 0, "ABORTED")
        }
        const timeoutErr = new ApiError("请求超时，请检查网络后重试", 0, "TIMEOUT")
        if (attempt < retries) {
          lastError = timeoutErr
          await delay(retryDelay * Math.pow(2, attempt))
          continue
        }
        throw timeoutErr
      }

      // Network error
      const netErr = new ApiError("网络连接失败，请检查网络", 0, "NETWORK_ERROR")
      if (attempt < retries) {
        lastError = netErr
        await delay(retryDelay * Math.pow(2, attempt))
        continue
      }
      throw netErr
    }
  }

  // Should not reach here, but just in case
  throw lastError || new ApiError("未知错误", 0, "UNKNOWN")
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 便捷方法
 */
export const api = {
  get: <T>(url: string, opts?: ApiClientOptions) =>
    apiClient<T>(url, { ...opts, method: "GET" }),

  post: <T>(url: string, body?: unknown, opts?: ApiClientOptions) =>
    apiClient<T>(url, { ...opts, method: "POST", body }),

  put: <T>(url: string, body?: unknown, opts?: ApiClientOptions) =>
    apiClient<T>(url, { ...opts, method: "PUT", body }),

  patch: <T>(url: string, body?: unknown, opts?: ApiClientOptions) =>
    apiClient<T>(url, { ...opts, method: "PATCH", body }),

  delete: <T>(url: string, opts?: ApiClientOptions) =>
    apiClient<T>(url, { ...opts, method: "DELETE" }),
}

/** 便捷别名 */
export const apiGet = <T>(url: string, opts?: ApiClientOptions) => api.get<T>(url, opts)
export const apiPost = <T>(url: string, body?: unknown, opts?: ApiClientOptions) => api.post<T>(url, body, opts)
export const apiPut = <T>(url: string, body?: unknown, opts?: ApiClientOptions) => api.put<T>(url, body, opts)
export const apiPatch = <T>(url: string, body?: unknown, opts?: ApiClientOptions) => api.patch<T>(url, body, opts)
export const apiDelete = <T>(url: string, opts?: ApiClientOptions) => api.delete<T>(url, opts)

/**
 * 不抛异常的便捷封装（用于按钮/组件场景，需自行处理 ok/error）
 */
export async function apiDeleteSafe(
  url: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.delete<unknown>(url, body)
    return { ok: true }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message }
    return { ok: false, error: "删除失败" }
  }
}

export async function apiFetchSafe<T = unknown>(
  url: string,
  options?: ApiClientOptions,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const data = await apiClient<T>(url, options)
    return { ok: true, data }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message }
    return { ok: false, error: "请求失败" }
  }
}
