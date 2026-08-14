import { fetchWithTimeout, withRetry, isRetriableResponse } from "@/lib/http"

describe("fetchWithTimeout", () => {
  const realFetch = (globalThis as { fetch?: unknown }).fetch
  afterEach(() => {
    ;(globalThis as { fetch?: unknown }).fetch = realFetch
  })

  it("正常请求在超时内返回", async () => {
    const fakeRes = { ok: true, status: 200, json: async () => ({}) } as unknown as Response
    ;(globalThis as { fetch?: unknown }).fetch = jest.fn().mockResolvedValue(fakeRes)
    const res = await fetchWithTimeout("https://example.com", { timeoutMs: 1000 })
    expect(res.status).toBe(200)
  })

  it("超时后中断并抛错", async () => {
    ;(globalThis as { fetch?: unknown }).fetch = jest.fn((_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
      })
    })
    await expect(fetchWithTimeout("https://slow.test", { timeoutMs: 50 })).rejects.toBeDefined()
  })
})

describe("withRetry", () => {
  it("网络错误时按指数退避重试直至成功", async () => {
    let attempts = 0
    const result = await withRetry(
      async () => {
        attempts++
        if (attempts < 3) throw new Error("network")
        return "ok"
      },
      { retries: 3, baseDelayMs: 1 },
    )
    expect(result).toBe("ok")
    expect(attempts).toBe(3)
  })

  it("达到最大重试次数后抛出最后错误", async () => {
    let attempts = 0
    await expect(
      withRetry(
        async () => {
          attempts++
          throw new Error("always fail")
        },
        { retries: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("always fail")
    expect(attempts).toBe(3)
  })
})

describe("isRetriableResponse", () => {
  it("5xx 与 429 可重试", () => {
    expect(isRetriableResponse({ status: 503 } as unknown as Response)).toBe(true)
    expect(isRetriableResponse({ status: 429 } as unknown as Response)).toBe(true)
  })
  it("4xx（非 429）默认不重试", () => {
    expect(isRetriableResponse({ status: 400 } as unknown as Response)).toBe(false)
    expect(isRetriableResponse({ status: 404 } as unknown as Response)).toBe(false)
  })
  it("retryOn4xx 时 4xx 可重试", () => {
    expect(isRetriableResponse({ status: 404 } as unknown as Response, true)).toBe(true)
  })
})
