import { safeRedirect } from "@/lib/safe-redirect"

describe("B-9 SEC-E 安全重定向助手", () => {
  it("允许同源相对路径", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard")
    expect(safeRedirect("/login?next=/x")).toBe("/login?next=/x")
    expect(safeRedirect("/profile/edit")).toBe("/profile/edit")
  })
  it("拒绝协议相对路径 //evil.com", () => {
    expect(safeRedirect("//evil.com")).toBe("/")
  })
  it("拒绝绝对 URL http(s)://evil.com", () => {
    expect(safeRedirect("http://evil.com")).toBe("/")
    expect(safeRedirect("https://evil.com/x")).toBe("/")
  })
  it("拒绝 javascript: 伪协议", () => {
    expect(safeRedirect("javascript:alert(1)")).toBe("/")
  })
  it("null / 空 / 未定义回退默认 /", () => {
    expect(safeRedirect(null)).toBe("/")
    expect(safeRedirect("")).toBe("/")
    expect(safeRedirect(undefined)).toBe("/")
  })
  it("自定义 fallback", () => {
    expect(safeRedirect("http://evil.com", "/home")).toBe("/home")
  })
})
