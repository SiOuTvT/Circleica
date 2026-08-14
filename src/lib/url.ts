/**
 * URL 协议校验（SEC-A 修复核心）。
 *
 * 仅允许 http: / https: 绝对协议；可选允许同源相对路径（以 / 开头）。
 * 拒绝 javascript: / data: / file: / ftp: 等危险或无关协议，避免协议注入 / 存储型 XSS。
 *
 * 纯函数校验见 ./url-util.ts（isHttpUrl / isHttpOrRelativeUrl）。
 * 注意：z.string().url() 仅做格式校验，会放行 javascript:/data:/file:/ftp: 等伪协议，
 * 因此全站用户可控的 URL 字段必须改用本文件的校验器，禁止直接使用 z.string().url()。
 */
import { z } from "zod"
import { isHttpUrl, isHttpOrRelativeUrl } from "./url-util"

export { isHttpUrl, isHttpOrRelativeUrl, HTTP_PROTOCOLS }

/** zod 校验器：仅允许 http/https 绝对 URL（用于下载外链等必须是绝对地址的字段）。 */
export const httpUrl = (msg = "链接必须是 http 或 https 地址") =>
  z.string().refine((v) => isHttpUrl(v), { message: msg })

/** zod 校验器：http/https 绝对 URL 或同源相对路径（用于封面图等上传返回字段）。 */
export const httpOrRelativeUrl = (msg = "链接必须是 http/https 地址或同源相对路径") =>
  z.string().refine((v) => isHttpOrRelativeUrl(v), { message: msg })
