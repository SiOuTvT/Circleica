/**
 * sanitize 工具测试
 * sanitizeUrl / sanitizeFilename / sanitizeSearchQuery 是纯函数，不依赖 DOMPurify，可完整真测；
 * stripHtml / sanitizeRichText / sanitizeString / sanitizeObject 依赖 isomorphic-dompurify，
 * jest.config 已将其全局映射到 src/__mocks__/dompurify.ts（移除 script 标签与 on* 内联事件），
 * 此处验证调用行为与基础净化效果。
 * @jest-environment node
 */

import {
  stripHtml,
  sanitizeRichText,
  sanitizeString,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeObject,
} from "@/lib/sanitize"

describe("sanitizeUrl", () => {
  it("放行站内相对路径（/ 开头）", () => {
    expect(sanitizeUrl("/uploads/screenshots/a.png")).toBe("/uploads/screenshots/a.png")
  })

  it("放行 http / https 绝对 URL", () => {
    expect(sanitizeUrl("https://example.com/a")).toBe("https://example.com/a")
    expect(sanitizeUrl("http://example.com/a")).toBe("http://example.com/a")
  })

  it("拒绝 javascript: / data: / ftp: 等非 http(s) 协议", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull()
    expect(sanitizeUrl("data:text/html,<script>1</script>")).toBeNull()
    expect(sanitizeUrl("ftp://example.com/a")).toBeNull()
  })

  it("拒绝非法 URL 与空串", () => {
    expect(sanitizeUrl("not a url")).toBeNull()
    expect(sanitizeUrl("")).toBeNull()
  })

  it("先 trim 再校验，相对路径也 trim", () => {
    expect(sanitizeUrl("  /relative  ")).toBe("/relative")
  })
})

describe("sanitizeFilename", () => {
  it("移除路径分隔符，阻断目录穿越", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/")
    expect(sanitizeFilename("a/b\\c")).toBe("abc")
  })

  it("保留中文与常规安全字符", () => {
    expect(sanitizeFilename("游戏封面.png")).toBe("游戏封面.png")
    expect(sanitizeFilename("cover_1.2-final.jpg")).toBe("cover_1.2-final.jpg")
  })

  it("连续点号折叠为单个，防 .. 穿越", () => {
    expect(sanitizeFilename("../x")).not.toContain("..")
  })

  it("长度截断到 255", () => {
    expect(sanitizeFilename("a".repeat(300)).length).toBe(255)
  })
})

describe("sanitizeSearchQuery", () => {
  it("移除 <>{}()[]\\/ 等特殊字符", () => {
    expect(sanitizeSearchQuery("<script>alert(1)</script>")).toBe("scriptalert1script")
    expect(sanitizeSearchQuery("a{b}c[d]")).toBe("abcd")
  })

  it("合并连续空白为单个空格", () => {
    expect(sanitizeSearchQuery("  终之空    remake  ")).toBe("终之空 remake")
  })

  it("长度截断到 100", () => {
    expect(sanitizeSearchQuery("a".repeat(200)).length).toBe(100)
  })
})

describe("stripHtml / sanitizeString / sanitizeRichText（DOMPurify mock）", () => {
  it("stripHtml 移除 script 标签", () => {
    expect(stripHtml("<script>x</script>hi")).toBe("hi")
  })

  it("sanitizeString 移除 script 并 trim", () => {
    expect(sanitizeString("  <script>x</script> hello  ")).toBe("hello")
  })

  it("sanitizeRichText 移除内联事件属性（on*）", () => {
    const out = sanitizeRichText('<p onclick="x">hi</p>')
    expect(out).not.toContain("onclick")
    expect(out).toContain("hi")
  })
})

describe("sanitizeObject", () => {
  it("仅清洗指定字符串字段，其余原样保留", () => {
    const out = sanitizeObject(
      { title: "<script>x</script>ok", id: 1, note: "keep <script>y</script>" },
      ["title"],
    )
    expect(out.title).toBe("ok")
    expect(out.id).toBe(1)
    expect(out.note).toBe("keep <script>y</script>")
  })
})
