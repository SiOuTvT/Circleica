/**
 * 统一存储抽象层
 *
 * 使用方式：
 *   import { getStorage } from "@/lib/storage"
 *   const storage = getStorage()
 *   const { url, key } = await storage.upload(buffer, "images", "jpg")
 *   await storage.delete(key)
 *
 * 配置来源：后台服务配置（SiteSetting）> 环境变量（process.env）
 * 未配置 R2 时自动使用本地文件系统存储。
 */

import crypto from "crypto"
import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { mkdir, writeFile, unlink } from "fs/promises"
import path from "path"
import { logger } from "./logger"
import { UPLOAD, STORAGE } from "./config"
import { getR2Config } from "./service-config"

// ── 接口定义 ────────────────────────

export interface UploadResult {
  /** 可访问的 URL */
  url: string
  /** 存储 key（用于删除） */
  key: string
}

export interface StorageAdapter {
  name: string
  upload(file: Buffer | Uint8Array, folder: string, ext: string): Promise<UploadResult>
  delete(key: string): Promise<void>
}

// ── MIME 映射 ────────────────────────

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
}

function getMimeType(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] || "application/octet-stream"
}

function generateKey(folder: string, ext: string): string {
  const hash = crypto.randomBytes(8).toString("hex")
  const timestamp = Date.now()
  return `${folder}/${timestamp}-${hash}.${ext}`
}

// ── Local Adapter ───────────────────

class LocalStorageAdapter implements StorageAdapter {
  name = "local"
  private uploadDir: string

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads")
  }

  async upload(file: Buffer | Uint8Array, folder: string, ext: string): Promise<UploadResult> {
    const key = generateKey(folder, ext)
    const filePath = path.join(this.uploadDir, key)
    const dir = path.dirname(filePath)

    await mkdir(dir, { recursive: true })
    await writeFile(filePath, file)

    return { url: `/uploads/${key}`, key }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    await unlink(filePath).catch((e) => logger.upload.error("本地文件删除失败", e))
  }
}

// ── R2 Adapter (S3 兼容) ───────────

class R2StorageAdapter implements StorageAdapter {
  name = "r2"
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor() {
    const cfg = getR2Config()!

    this.bucket = cfg.bucketName
    this.publicUrl = cfg.publicUrl

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    })
  }

  async upload(file: Buffer | Uint8Array, folder: string, ext: string): Promise<UploadResult> {
    const key = generateKey(folder, ext)

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: getMimeType(ext),
        CacheControl: STORAGE.CACHE_CONTROL,
      }),
    )

    return { url: `${this.publicUrl}/${key}`, key }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      )
    } catch (e) {
      logger.upload.error("R2 删除失败", e, { key })
    }
  }
}

// ── 工厂 ────────────────────────────

let _storage: StorageAdapter | null = null

/**
 * 获取存储适配器（单例）
 * 根据环境变量自动选择：有 R2_BUCKET_NAME → R2，否则 → Local
 */
export function getStorage(): StorageAdapter {
  if (_storage) return _storage

  if (getR2Config()) {
    _storage = new R2StorageAdapter()
    logger.upload.info("存储后端: Cloudflare R2")
  } else {
    _storage = new LocalStorageAdapter()
    logger.upload.info("存储后端: 本地文件系统")
  }

  return _storage
}

/**
 * 当前存储后端名称
 */
export function getStorageBackend(): string {
  return getStorage().name
}

/**
 * 根据可访问 URL 反推存储 key 并删除（用于替换/清理孤儿文件，L10）。
 * 仅对本地 / R2 自身生成的 URL 生效；外部头像（OAuth 等）会被安全忽略，不会误删。
 */
export async function deleteByUrl(url?: string | null): Promise<void> {
  if (!url) return
  const adapter = getStorage()
  let rawKey: string | null = null
  if (adapter.name === "local") {
    const marker = "/uploads/"
    const idx = url.indexOf(marker)
    rawKey = idx >= 0 ? url.slice(idx + marker.length) : null
  } else {
    const base = process.env.R2_PUBLIC_URL
    if (base && url.startsWith(`${base}/`)) rawKey = url.slice(base.length + 1)
  }
  if (!rawKey) return
  // 纵深防御：阻断路径穿越（../），避免误删存储根之外的文件 / 对象
  // path.normalize 会消解中间的 ".." 段；仅当归约后仍以前导 ".." 或绝对路径开头才算逃逸
  const key = path.normalize(rawKey)
  if (key.startsWith("..") || path.isAbsolute(key)) return
  await adapter.delete(key)
}
