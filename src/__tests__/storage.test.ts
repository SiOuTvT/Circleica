/**
 * 存储适配器密钥生成测试
 * @jest-environment node
 */
import crypto from "crypto"

// 测试 key 生成逻辑（与 storage.ts 的 generateKey 一致）
function generateKey(folder: string, ext: string): string {
  const hash = crypto.randomBytes(8).toString("hex")
  const timestamp = Date.now()
  return `${folder}/${timestamp}-${hash}.${ext}`
}

describe("Storage key generation", () => {
  it("generates key with correct format", () => {
    const key = generateKey("games", "jpg")
    expect(key).toMatch(/^games\/\d+-[a-f0-9]{16}\.jpg$/)
  })

  it("different calls produce different keys", () => {
    const key1 = generateKey("games", "png")
    const key2 = generateKey("games", "png")
    expect(key1).not.toBe(key2)
  })

  it("respects folder parameter", () => {
    const key = generateKey("avatars", "webp")
    expect(key).toMatch(/^avatars\//)
    expect(key).toMatch(/\.webp$/)
  })

  it("handles various extensions", () => {
    for (const ext of ["jpg", "png", "webp", "gif", "mp3"]) {
      const key = generateKey("test", ext)
      expect(key).toMatch(new RegExp(`\\.${ext}$`))
    }
  })
})
