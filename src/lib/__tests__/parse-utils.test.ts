import { parseStringArray, parseFileSizes, safeParse } from "../parse-utils"

describe("parseStringArray", () => {
  it("should parse JSON array", () => {
    expect(parseStringArray('["a","b","c"]')).toEqual(["a", "b", "c"])
  })

  it("should parse comma-separated string", () => {
    expect(parseStringArray("a,b,c")).toEqual(["a", "b", "c"])
  })

  it("should parse Chinese comma", () => {
    expect(parseStringArray("a，b，c")).toEqual(["a", "b", "c"])
  })

  it("should parse Chinese comma", () => {
    expect(parseStringArray("a、b、c")).toEqual(["a", "b", "c"])
  })

  it("should return empty array for null", () => {
    expect(parseStringArray(null)).toEqual([])
  })

  it("should return empty array for undefined", () => {
    expect(parseStringArray(undefined)).toEqual([])
  })

  it("should filter empty strings", () => {
    expect(parseStringArray("a,,b,c")).toEqual(["a", "b", "c"])
  })
})

describe("parseFileSizes", () => {
  it("should parse JSON array", () => {
    const input = '[{"value":"100","unit":"MB"}]'
    expect(parseFileSizes(input)).toEqual([{ value: "100", unit: "MB" }])
  })

  it("should parse comma-separated sizes", () => {
    expect(parseFileSizes("100MB, 2GB")).toEqual([
      { value: "100", unit: "MB" },
      { value: "2", unit: "GB" },
    ])
  })

  it("should return empty array for null", () => {
    expect(parseFileSizes(null)).toEqual([])
  })
})

describe("safeParse", () => {
  it("should parse valid JSON", () => {
    expect(safeParse('{"a":1}', {})).toEqual({ a: 1 })
  })

  it("should return fallback for invalid JSON", () => {
    expect(safeParse("invalid", {})).toEqual({})
  })

  it("should return fallback for null", () => {
    expect(safeParse(null, [])).toEqual([])
  })

  it("should return object directly if already parsed", () => {
    const obj = { a: 1 }
    expect(safeParse(obj, {})).toEqual({ a: 1 })
  })
})
