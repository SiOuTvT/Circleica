import crypto from 'crypto'
import fs from 'fs/promises'
import { logger } from './logger'
import path from 'path'
import sharp from 'sharp'

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')
const FRAME_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatar-frames')

/**
 * 合成头像和头像框
 * 输出 WebP 格式，256×256，quality 85（体积约 PNG 的 1/3~1/5，视觉无损）
 *
 * @param avatarUrl 原始头像 URL（/uploads/xxx.jpg 或远程URL）
 * @param frameId 头像框 ID（内置头像框用文件名，DB头像框传 'db'）
 * @param frameImageUrl DB头像框的图片URL（远程），传入时忽略frameId
 * @returns 合成后的头像 URL（/uploads/avatars/composed-xxx.webp）
 */
export async function composeAvatar(
  avatarUrl: string,
  frameId: string,
  frameImageUrl?: string | null,
): Promise<string> {
  try {
    // 确保输出目录存在
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    let frameBuffer: Buffer

    if (frameImageUrl) {
      // DB头像框：从远程URL获取图片
      const frameRes = await fetch(frameImageUrl)
      if (!frameRes.ok) {
        logger.upload.warn("DB头像框图片获取失败", { frameImageUrl })
        return avatarUrl
      }
      const frameArrayBuf = await frameRes.arrayBuffer()
      frameBuffer = Buffer.from(frameArrayBuf)
    } else {
      // 内置头像框：从本地文件读取
      const framePath = path.join(FRAME_DIR, `${frameId}.png`)
      try {
        await fs.access(framePath)
      } catch {
        logger.upload.warn("头像框文件不存在", { framePath })
        return avatarUrl
      }
      frameBuffer = await fs.readFile(framePath)
    }

    // 读取原始头像（支持本地路径和远程URL）
    let avatarBuffer: Buffer
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      const avatarRes = await fetch(avatarUrl)
      if (!avatarRes.ok) {
        logger.upload.warn("远程头像获取失败", { avatarUrl })
        return avatarUrl
      }
      avatarBuffer = Buffer.from(await avatarRes.arrayBuffer())
    } else {
      const avatarPath = path.join(process.cwd(), 'public', avatarUrl)
      avatarBuffer = await fs.readFile(avatarPath)
    }

    // 统一输出尺寸 256×256
    const outputSize = 256

    // 将头像缩放到输出尺寸
    const resizedAvatar = await sharp(avatarBuffer)
      .resize(outputSize, outputSize, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer()

    // 将头像框也缩放到同样的尺寸（确保对齐）
    const resizedFrame = await sharp(frameBuffer)
      .resize(outputSize, outputSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 85 })
      .toBuffer()

    // 叠加头像框
    const composedBuffer = await sharp(resizedAvatar)
      .composite([{
        input: resizedFrame,
        top: 0,
        left: 0,
      }])
      .webp({ quality: 85 })
      .toBuffer()

    // 生成唯一文件名（使用 crypto 避免碰撞）
    const timestamp = Date.now()
    const random = crypto.randomBytes(6).toString("hex")
    const filename = `composed-${frameId}-${timestamp}-${random}.webp`
    const outputPath = path.join(OUTPUT_DIR, filename)

    // 保存合成后的图片
    await fs.writeFile(outputPath, composedBuffer)

    logger.upload.info(`头像合成完成: ${filename}`)
    return `/uploads/avatars/${filename}`
  } catch (error) {
    logger.upload.error('头像合成失败', error)
    return avatarUrl // 失败时返回原头像
  }
}

/**
 * 清理用户旧的合成头像文件
 */
export async function cleanupOldComposedAvatar(composedUrl: string): Promise<void> {
  if (!composedUrl) return

  // 处理本地合成头像（/uploads/avatars/composed-xxx.webp 或 .png）
  if (composedUrl.startsWith('/uploads/avatars/composed-')) {
    try {
      const filePath = path.join(process.cwd(), 'public', composedUrl)
      await fs.unlink(filePath)
      logger.upload.debug(`已清理旧合成头像: ${composedUrl}`)
    } catch {
      // 文件可能已被删除，忽略错误
    }
  }
}