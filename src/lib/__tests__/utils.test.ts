import { cn, getRandomAvatarColor, getAvatarTextColor } from "../utils"

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
  })

  it("should handle tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})

describe("getRandomAvatarColor", () => {
  it("should return consistent color for same name", () => {
    const color1 = getRandomAvatarColor("test")
    const color2 = getRandomAvatarColor("test")
    expect(color1).toBe(color2)
  })

  it("should return different colors for different names", () => {
    const color1 = getRandomAvatarColor("alice")
    const color2 = getRandomAvatarColor("bob")
    expect(color1).not.toBe(color2)
  })

  it("should return HSL color format", () => {
    const color = getRandomAvatarColor("test")
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
  })
})

describe("getAvatarTextColor", () => {
  it("should return white for dark backgrounds", () => {
    expect(getAvatarTextColor("hsl(200, 40%, 45%)")).toBe("#ffffff")
  })

  it("should return dark for light backgrounds", () => {
    expect(getAvatarTextColor("hsl(60, 40%, 60%)")).toBe("#1a1a1a")
  })

  it("should return white for invalid format", () => {
    expect(getAvatarTextColor("invalid")).toBe("#ffffff")
  })
})
