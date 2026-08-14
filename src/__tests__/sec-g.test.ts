/**
 * @jest-environment node
 */
import { checkJsonBodySize } from "@/lib/api-handler"
import { NextRequest } from "next/server"

describe("A-4 SEC-G 写接口 body 大小限制", () => {
  it("JSON 写请求超过上限返回 413", () => {
    const req = new NextRequest("http://localhost:3000/api/x", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(2 * 1024 * 1024) },
    })
    const res = checkJsonBodySize(req)
    expect(res?.status).toBe(413)
  })

  it("JSON 写请求在限内放行（null）", () => {
    const req = new NextRequest("http://localhost:3000/api/x", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "100" },
    })
    expect(checkJsonBodySize(req)).toBeNull()
  })

  it("multipart 上传不受 JSON 上限约束（由各路由自行限制）", () => {
    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=---", "content-length": String(50 * 1024 * 1024) },
    })
    expect(checkJsonBodySize(req)).toBeNull()
  })

  it("GET 请求不受限制", () => {
    const req = new NextRequest("http://localhost:3000/api/x", {
      method: "GET",
      headers: { "content-length": String(999999999) },
    })
    expect(checkJsonBodySize(req)).toBeNull()
  })
})
