/**
 * @jest-environment node
 */
import { assertSafeHttpUrl, SsrfBlockedError, isLinkLocalOrMetadataIp } from "@/lib/ssrf"

describe("A-3 SEC-C SSRF 守卫", () => {
  it("拒绝云元数据地址 169.254.169.254", async () => {
    await expect(assertSafeHttpUrl("http://169.254.169.254/latest/meta-data")).rejects.toBeInstanceOf(
      SsrfBlockedError,
    )
  })

  it("仅允许 http/https：拒绝 file:/gopher: 伪协议", async () => {
    await expect(assertSafeHttpUrl("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfBlockedError)
    await expect(assertSafeHttpUrl("gopher://127.0.0.1:6379")).rejects.toBeInstanceOf(SsrfBlockedError)
  })

  it("允许回环地址（运维自有 localhost 服务自测）", async () => {
    await expect(assertSafeHttpUrl("http://127.0.0.1:6379")).resolves.toBeDefined()
  })

  it("允许私网地址（运维自有 LAN 自托管服务）", async () => {
    await expect(assertSafeHttpUrl("http://192.168.1.10:6379")).resolves.toBeDefined()
  })

  it("isLinkLocalOrMetadataIp 命中链路本地/元数据", () => {
    expect(isLinkLocalOrMetadataIp("169.254.169.254")).toBe(true)
    expect(isLinkLocalOrMetadataIp("::1")).toBe(true)
    expect(isLinkLocalOrMetadataIp("127.0.0.1")).toBe(false)
    expect(isLinkLocalOrMetadataIp("192.168.1.10")).toBe(false)
  })
})
