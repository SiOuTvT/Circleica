// Mock isomorphic-dompurify for test environment
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (input: string) => input.replace(/<[^>]*>/g, ""),
}))

import { stripHtml, sanitizeString, sanitizeSearchQuery, sanitizeFilename, sanitizeUrl } from "../sanitize"

describe("stripHtml", () => {
  it("should remove HTML tags", () => {
    expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World")
  })

  it("should handle empty string", () => {
    expect(stripHtml("")).toBe("")
  })
})

describe("sanitizeString", () => {
  it("should remove angle brackets", () => {
    expect(sanitizeString("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script")
  })

  it("should remove javascript protocol", () => {
    expect(sanitizeString("javascript:alert('xss')")).toBe("alert('xss')")
  })

  it("should trim whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello")
  })
})

describe("sanitizeSearchQuery", () => {
  it("should remove special characters", () => {
    expect(sanitizeSearchQuery("test<>{}")).toBe("test")
  })

  it("should merge multiple spaces", () => {
    expect(sanitizeSearchQuery("test   query")).toBe("test query")
  })

  it("should limit length to 100", () => {
    const longQuery = "a".repeat(200)
    expect(sanitizeSearchQuery(longQuery).length).toBe(100)
  })
})

describe("sanitizeFilename", () => {
  it("should keep safe characters", () => {
    expect(sanitizeFilename("test-file_123.jpg")).toBe("test-file_123.jpg")
  })

  it("should remove unsafe characters", () => {
    expect(sanitizeFilename("test file@#.jpg")).toBe("testfile.jpg")
  })

  it("should prevent path traversal", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe(".etcpasswd")
  })
})

describe("sanitizeUrl", () => {
  it("should accept http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/")
  })

  it("should accept https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/")
  })

  it("should reject javascript protocol", () => {
    expect(sanitizeUrl("javascript:alert('xss')")).toBeNull()
  })

  it("should reject invalid URLs", () => {
    expect(sanitizeUrl("not a url")).toBeNull()
  })
})
