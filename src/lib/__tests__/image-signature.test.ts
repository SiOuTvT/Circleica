import { detectImageType, verifyImageSignature } from "@/lib/image-signature"

const hex = (s: string) => Uint8Array.from(Buffer.from(s.replace(/\s/g, ""), "hex"))
const txt = (s: string) => Uint8Array.from(Buffer.from(s))

describe("B-8 SEC-D 图片魔数校验", () => {
  it("识别 PNG 签名", () => {
    expect(detectImageType(hex("89504e470d0a1a0a"))).toBe("image/png")
  })
  it("识别 JPEG 签名", () => {
    expect(detectImageType(hex("ffd8ffe0"))).toBe("image/jpeg")
  })
  it("识别 GIF89a 签名", () => {
    expect(detectImageType(hex("474946383961"))).toBe("image/gif")
  })
  it("识别 WebP (RIFF....WEBP) 签名", () => {
    expect(detectImageType(hex("52494646" + "00000000" + "57454250"))).toBe("image/webp")
  })
  it("识别 AVIF (ftyp avif) 签名", () => {
    expect(detectImageType(hex("0000000c" + "66747970" + "61766966"))).toBe("image/avif")
  })

  it("拒绝 SVG 文本（避免存储型 XSS）", () => {
    expect(detectImageType(txt('<?xml version="1.0"?><svg>'))).toBeNull()
  })
  it("拒绝 HTML 多边形文件", () => {
    expect(detectImageType(txt("<html><body>x</body></html>"))).toBeNull()
  })

  it("声明 MIME 与实际签名一致时通过", () => {
    const png = hex("89504e470d0a1a0a")
    expect(verifyImageSignature(png, "image/png")).toBe(true)
  })
  it("伪造 Content-Type（PNG 字节却声明 gif）被拒绝", () => {
    const png = hex("89504e470d0a1a0a")
    expect(verifyImageSignature(png, "image/gif")).toBe(false)
  })
  it("危险格式（SVG）无论声明什么都拒绝", () => {
    const svg = txt('<?xml version="1.0"?><svg onload=alert(1)>')
    expect(verifyImageSignature(svg, "image/svg+xml")).toBe(false)
  })
})
