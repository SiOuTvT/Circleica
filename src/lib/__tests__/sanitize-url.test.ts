import { sanitizeExternalUrl } from "@/lib/sanitize-url"

describe("sanitizeExternalUrl", () => {
  it("放行 http/https", () => {
    expect(sanitizeExternalUrl("https://example.com/a")).toBe("https://example.com/a")
    expect(sanitizeExternalUrl("http://example.com")).toBe("http://example.com/")
  })

  it("拒绝 javascript:/data:/file: 等危险协议", () => {
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull()
    expect(sanitizeExternalUrl("data:text/html,<script>")).toBeNull()
    expect(sanitizeExternalUrl("file:///etc/passwd")).toBeNull()
  })

  it("空值/非法返回 null", () => {
    expect(sanitizeExternalUrl("")).toBeNull()
    expect(sanitizeExternalUrl(null)).toBeNull()
    expect(sanitizeExternalUrl("not a url")).toBeNull()
  })

  it("去除首尾空白", () => {
    expect(sanitizeExternalUrl("  https://example.com  ")).toBe("https://example.com/")
  })
})
