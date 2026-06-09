import { serialIdToUid, isNumericId } from "../serial-id"

describe("serialIdToUid", () => {
  it("should pad to 5 digits for small numbers", () => {
    expect(serialIdToUid(1)).toBe("00001")
    expect(serialIdToUid(42)).toBe("00042")
    expect(serialIdToUid(99999)).toBe("99999")
  })

  it("should not pad for large numbers", () => {
    expect(serialIdToUid(100000)).toBe("100000")
    expect(serialIdToUid(123456)).toBe("123456")
  })
})

describe("isNumericId", () => {
  it("should return true for numeric strings", () => {
    expect(isNumericId("123")).toBe(true)
    expect(isNumericId("0")).toBe(true)
    expect(isNumericId("99999")).toBe(true)
  })

  it("should return false for non-numeric strings", () => {
    expect(isNumericId("abc")).toBe(false)
    expect(isNumericId("clxyz123")).toBe(false)
    expect(isNumericId("")).toBe(false)
  })
})
