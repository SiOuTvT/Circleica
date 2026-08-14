import { isHttpUrl, isHttpOrRelativeUrl } from "../url-util"

describe("isHttpUrl (SEC-A 统一协议校验)", () => {
  it("拒绝危险伪协议 / 非 http(s) 协议", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpUrl("data:text/html,1")).toBe(false)
    expect(isHttpUrl("file:///etc/passwd")).toBe(false)
    expect(isHttpUrl("ftp://evil.com/x")).toBe(false)
    expect(isHttpUrl("//evil.com")).toBe(false)
  })
  it("接受 http / https（含大写协议）", () => {
    expect(isHttpUrl("http://a.com")).toBe(true)
    expect(isHttpUrl("https://a.com/x?y=1")).toBe(true)
    expect(isHttpUrl("HTTP://a.com")).toBe(true)
  })
  it("空值 / null / undefined 安全", () => {
    expect(isHttpUrl("")).toBe(false)
    expect(isHttpUrl(null)).toBe(false)
    expect(isHttpUrl(undefined)).toBe(false)
  })
})

describe("isHttpOrRelativeUrl", () => {
  it("接受同源相对路径（对象存储上传返回）", () => {
    expect(isHttpOrRelativeUrl("/uploads/x.png")).toBe(true)
  })
  it("拒绝非 http(s) 绝对地址", () => {
    expect(isHttpOrRelativeUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpOrRelativeUrl("ftp://evil.com")).toBe(false)
  })
})
