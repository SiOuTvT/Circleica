import { timeAgo, timeAgoPublished } from "../time-ago"

describe("timeAgo", () => {
  it("should return '刚刚' for recent times", () => {
    const now = new Date()
    expect(timeAgo(now)).toBe("刚刚")
  })

  it("should return minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(timeAgo(fiveMinAgo)).toBe("5 分钟前")
  })

  it("should return hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(timeAgo(twoHoursAgo)).toBe("2 小时前")
  })

  it("should return days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(timeAgo(threeDaysAgo)).toBe("3 天前")
  })

  it("should handle string input", () => {
    const dateStr = new Date(Date.now() - 60 * 1000).toISOString()
    expect(timeAgo(dateStr)).toBe("1 分钟前")
  })
})

describe("timeAgoPublished", () => {
  it("should return '今天发布' for today", () => {
    expect(timeAgoPublished(new Date())).toBe("今天发布")
  })

  it("should return '昨天发布' for yesterday", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(timeAgoPublished(yesterday)).toBe("昨天发布")
  })

  it("should return days ago for older dates", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    expect(timeAgoPublished(fiveDaysAgo)).toBe("5 天前发布")
  })
})
