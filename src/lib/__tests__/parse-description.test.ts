import { parseDescription, serializeDescription, getDescriptionText, getDescriptionLang, getAllDescriptions } from "../parse-description"

describe("parseDescription", () => {
  it("should parse JSON format", () => {
    const input = JSON.stringify({ zh: "中文", en: "English", ja: "日本語", other: "" })
    expect(parseDescription(input)).toEqual({ zh: "中文", en: "English", ja: "日本語", other: "" })
  })

  it("should handle plain text as Chinese", () => {
    expect(parseDescription("纯文本描述")).toEqual({ zh: "纯文本描述", en: "", ja: "", other: "" })
  })

  it("should return empty for null", () => {
    expect(parseDescription(null)).toEqual({ zh: "", en: "", ja: "", other: "" })
  })

  it("should return empty for undefined", () => {
    expect(parseDescription(undefined)).toEqual({ zh: "", en: "", ja: "", other: "" })
  })
})

describe("serializeDescription", () => {
  it("should serialize to JSON", () => {
    const input = { zh: "中文", en: "English", ja: "", other: "" }
    expect(serializeDescription(input)).toBe(JSON.stringify(input))
  })

  it("should return empty string for all empty", () => {
    expect(serializeDescription({ zh: "", en: "", ja: "", other: "" })).toBe("")
  })
})

describe("getDescriptionText", () => {
  it("should prefer Chinese", () => {
    const input = JSON.stringify({ zh: "中文", en: "English", ja: "日本語", other: "" })
    expect(getDescriptionText(input)).toBe("中文")
  })

  it("should fallback to English", () => {
    const input = JSON.stringify({ zh: "", en: "English", ja: "日本語", other: "" })
    expect(getDescriptionText(input)).toBe("English")
  })

  it("should fallback to Japanese", () => {
    const input = JSON.stringify({ zh: "", en: "", ja: "日本語", other: "" })
    expect(getDescriptionText(input)).toBe("日本語")
  })

  it("should return empty for null", () => {
    expect(getDescriptionText(null)).toBe("")
  })
})

describe("getDescriptionLang", () => {
  it("should return Chinese label", () => {
    const input = JSON.stringify({ zh: "中文", en: "", ja: "", other: "" })
    expect(getDescriptionLang(input)).toBe("中文")
  })

  it("should return English label", () => {
    const input = JSON.stringify({ zh: "", en: "English", ja: "", other: "" })
    expect(getDescriptionLang(input)).toBe("English")
  })

  it("should return null for empty", () => {
    expect(getDescriptionLang(null)).toBeNull()
  })
})

describe("getAllDescriptions", () => {
  it("should return all non-empty descriptions", () => {
    const input = JSON.stringify({ zh: "中文", en: "English", ja: "", other: "" })
    const result = getAllDescriptions(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ lang: "zh", label: "中文", text: "中文" })
    expect(result[1]).toEqual({ lang: "en", label: "English", text: "English" })
  })

  it("should return empty array for null", () => {
    expect(getAllDescriptions(null)).toEqual([])
  })
})
