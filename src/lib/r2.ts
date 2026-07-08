/**
 * @deprecated 使用 @/lib/storage 的 getStorage() 替代
 * 此文件保留仅作迁移参考，不再被任何代码引用。
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import crypto from "crypto"

// Cloudflare R2 (S3 兼容) 客户端
// 配置项需在 .env 中设置：
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

let _r2Client: S3Client | null = null

function getR2Client() {
  if (_r2Client) return _r2Client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("缺少 R2 配置，请检查 .env 中的 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY")
  }

  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _r2Client
}

export interface UploadResult {
  url: string
  key: string
}

/**
 * 上传文件到 Cloudflare R2
 * @param file     - 要上传的文件（File / Buffer）
 * @param folder   - 存储目录前缀，如 "images"、"avatars"
 * @param ext      - 文件扩展名，如 "jpg"、"png"
 */
export async function uploadToR2(
  file: Buffer | Uint8Array,
  folder: string,
  ext: string
): Promise<UploadResult> {
  const client = getR2Client()
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("缺少 R2_BUCKET_NAME 配置")

  const hash = crypto.randomBytes(8).toString("hex")
  const timestamp = Date.now()
  const key = `${folder}/${timestamp}-${hash}.${ext}`

  // 根据扩展名设置 Content-Type
  const mimeMap: Record<string, string> = {
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
  const contentType = mimeMap[ext.toLowerCase()] || "application/octet-stream"

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      // 设置 Cache-Control 以便 CDN 缓存
      CacheControl: "public, max-age=31536000, immutable",
    })
  )

  // 公开访问 URL（R2 自定义域名 或 公开访问域）
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicUrl) throw new Error("缺少 R2_PUBLIC_URL 配置")

  const url = `${publicUrl}/${key}`
  return { url, key }
}