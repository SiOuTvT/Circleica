"use client"

/**
 * 统一 API 客户端
 * - 统一 JSON 解析
 * - 统一错误处理
 * - 支持 AbortController
 * - 自动注入 auth header
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`)
    this.name = "ApiError"
  }
}

interface RequestOptions extends RequestInit {
  /** If provided, will be used for AbortController support */
  signal?: AbortSignal
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => null)
    }
    throw new ApiError(res.status, res.statusText, body)
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}

export function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: "GET", signal })
}

export function apiPost<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    signal,
  })
}

export function apiPut<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    signal,
  })
}

export function apiDelete<T>(url: string, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: "DELETE", signal })
}