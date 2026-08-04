import { announcementCreateSchema, announcementUpdateSchema } from "@/lib/validations"
import { sanitizeUrl } from "@/lib/sanitize"

describe("announcement relative-path imageUrl (regression for 数据验证失败)", () => {
  it("create accepts relative /uploads imageUrl + link", () => {
    const r = announcementCreateSchema.safeParse({
      title: "t",
      content: "c",
      imageUrl: "/uploads/images/1785840548535-abc.webp",
      link: "",
      status: "draft",
    })
    expect(r.success).toBe(true)
  })

  it("update accepts relative imageUrl", () => {
    const r = announcementUpdateSchema.safeParse({ imageUrl: "/uploads/x.png" })
    expect(r.success).toBe(true)
  })

  it("create still rejects junk url", () => {
    const r = announcementCreateSchema.safeParse({
      title: "t",
      content: "c",
      imageUrl: "not a url",
    })
    expect(r.success).toBe(false)
  })

  it("sanitizeUrl keeps relative path", () => {
    expect(sanitizeUrl("/uploads/x.png")).toBe("/uploads/x.png")
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull()
  })
})
