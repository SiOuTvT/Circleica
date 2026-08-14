/**
 * 图片魔数（文件签名）校验
 *
 * 仅依赖文件头字节判断真实格式，不信任客户端声明的 MIME type / 扩展名。
 * 用于上传入口（src/app/api/upload/route.ts）的纵深防御：即使攻击者伪造
 * Content-Type 或扩展名，只要实际字节签名与声明类型不符即拒绝。
 *
 * 注意：SVG 等可携带脚本的矢量格式不在白名单内（UPLOAD.IMAGE_TYPES 也未包含），
 * 因此本模块对 SVG 一律返回 null（拒绝），避免存储型 XSS。
 */

const SIGNATURES: ReadonlyArray<{
  mime: string
  match: (buf: Uint8Array) => boolean
}> = [
  {
    mime: "image/jpeg",
    match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    // GIF87a / GIF89a
    match: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) &&
      b[5] === 0x61,
  },
  {
    mime: "image/webp",
    // RIFF....WEBP
    match: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    mime: "image/avif",
    // 偏移 4 处为 'ftyp'，偏移 8 处 major brand 为 'avif'
    match: (b) =>
      b.length >= 12 &&
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70 &&
      b[8] === 0x61 &&
      b[9] === 0x76 &&
      b[10] === 0x69 &&
      b[11] === 0x66,
  },
]

/** 由真实字节签名推断图片 MIME；无法识别（含 SVG/脚本类）返回 null。 */
export function detectImageType(buffer: Uint8Array): string | null {
  for (const sig of SIGNATURES) {
    if (sig.match(buffer)) return sig.mime
  }
  return null
}

/**
 * 校验实际字节签名是否与声明的 MIME 一致。
 * @returns true 表示一致且属于受支持的安全位图格式；false 表示不符或为危险格式。
 */
export function verifyImageSignature(buffer: Uint8Array, declaredMime: string): boolean {
  const detected = detectImageType(buffer)
  if (!detected) return false
  return detected === declaredMime
}
