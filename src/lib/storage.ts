/**
 * 文件存储抽象层
 *
 * 当前实现：本地文件系统（public/uploads/）
 * 未来计划：迁移到 Cloudflare R2
 *
 * 使用方式：
 *   import { saveFile } from "@/lib/storage"
 *   const url = await saveFile(buffer, filename, mimeType)
 */

import { mkdir, writeFile } from "fs/promises"
import path from "path"

/** 存储后端配置 */
const STORAGE_BACKEND = process.env.R2_BUCKET_NAME ? "r2" : "local"

/**
 * 保存文件并返回可访问的 URL
 * @param buffer 文件内容
 * @param filename 文件名（含扩展名）
 * @param mimeType MIME 类型
 * @returns 可访问的 URL 路径
 */
export async function saveFile(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
  if (STORAGE_BACKEND === "r2") {
    // TODO: 实现 R2 上传
    // const r2 = new S3Client({ ... })
    // await r2.send(new PutObjectCommand({ ... }))
    // return `${process.env.R2_PUBLIC_URL}/${filename}`
    throw new Error("R2 存储尚未配置，请设置 R2_BUCKET_NAME 等环境变量")
  }

  // 本地文件系统存储
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)
  return `/uploads/${filename}`
}

/**
 * 删除文件（用于清理）
 * @param url 文件 URL（/uploads/xxx 或 R2 URL）
 */
export async function deleteFile(_url: string): Promise<void> {
  if (STORAGE_BACKEND === "r2") {
    // TODO: 实现 R2 删除
    return
  }

  // 本地文件系统删除（可选实现）
  // const filepath = path.join(process.cwd(), "public", url)
  // await unlink(filepath).catch(() => {})
}

/** 获取当前存储后端类型 */
export function getStorageBackend(): string {
  return STORAGE_BACKEND
}
