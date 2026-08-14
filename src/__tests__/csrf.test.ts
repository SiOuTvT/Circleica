import { enforceSameOrigin } from "@/lib/csrf"
import { NextRequest } from "next/server"

/** 构造一个指向状态变更 /api 路由的请求。 */
function mk(method: string, headers: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/creators/save", {
    method,
    headers,
  })
}

describe("A-2 SEC-B CSRF 同源强制校验（enforceSameOrigin）", () => {
  it("无 Origin 的状态变更请求被拒绝（关闭无头请求绕过面）", () => {
    const res = enforceSameOrigin(mk("POST", {}))
    expect(res?.status).toBe(403)
  })

  it("跨站 Origin 的状态变更请求被拒绝", () => {
    const res = enforceSameOrigin(mk("POST", { origin: "http://evil.com" }))
    expect(res?.status).toBe(403)
  })

  it("同源 Origin 的状态变更请求放行", () => {
    const res = enforceSameOrigin(mk("POST", { origin: "http://localhost:3000" }))
    expect(res).toBeNull()
  })

  it("无 Origin 但有同源 Referer 的状态变更请求放行", () => {
    const res = enforceSameOrigin(mk("POST", { referer: "http://localhost:3000/page" }))
    expect(res).toBeNull()
  })

  it("Bearer Token 调用的 API 客户端不受同源约束", () => {
    const res = enforceSameOrigin(mk("POST", { authorization: "Bearer tok" }))
    expect(res).toBeNull()
  })

  it("安全方法（GET）即使无 Origin 也不受 CSRF 约束（enforceSameOrigin 不区分方法，由 proxy 仅对状态变更触发）", () => {
    // enforceSameOrigin 本身不区分方法；proxy 只在 isStateChanging 时调用。
    // 此处验证函数对无 Origin 的同源 GET 仍会因缺 Origin/Referer 而拒绝，
    // 因此方法门控必须由 proxy 的 isStateChanging 保证。
    const res = enforceSameOrigin(mk("GET", {}))
    expect(res?.status).toBe(403)
  })
})

