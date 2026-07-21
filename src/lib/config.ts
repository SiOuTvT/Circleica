/**
 * 全局应用配置
 *
 * 所有业务常量集中管理，避免 Magic Number 散落各处。
 * 环境相关配置走 src/lib/env.ts，这里只放业务常量。
 */

// ── 缓存 TTL（秒）───────────────────
export const CACHE_TTL = {
  /** SiteSettings 单项缓存 */
  SITE_SETTING: 60,
  /** SiteSettings 全量缓存 */
  SITE_SETTINGS_ALL: 60,
  /** 站点初始化状态 */
  SITE_INITIALIZED: 300,
  /** Session 用户信息（用于 auth callback） */
  SESSION_USER: 30,
  /** 通用数据缓存 */
  DEFAULT: 3600,
} as const

// ── 分页 ────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  /** 管理后台默认每页条数 */
  ADMIN_PAGE_SIZE: 20,
} as const

// ── 用户 ────────────────────────────
export const USER = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  USERNAME_REGEX: /^[a-zA-Z0-9_]+$/,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  BIO_MAX: 500,
  /** JWT session 有效期（秒） */
  SESSION_MAX_AGE: 30 * 24 * 60 * 60,
} as const

// ── 游戏 ────────────────────────────
export const GAME = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 5000,
  TAGS_MAX: 20,
  TAG_NAME_MAX: 50,
  /** 首页推荐游戏数量 */
  FEATURED_COUNT: 8,
  /** 每个游戏显示的标签数量 */
  VISIBLE_TAGS: 3,
} as const

// ── 论坛 ────────────────────────────
export const FORUM = {
  POST_TITLE_MAX: 200,
  POST_CONTENT_MAX: 10000,
  COMMENT_MAX: 2000,
  /** 帖子列表每页条数 */
  POSTS_PER_PAGE: 20,
  /** 帖子评论每页条数 */
  COMMENTS_PER_PAGE: 50,
} as const

// ── 评论 ────────────────────────────
export const COMMENT = {
  CONTENT_MAX: 2000,
  /** 评论区每页条数 */
  PAGE_SIZE: 20,
} as const

// ── 文件上传 ────────────────────────
export const UPLOAD = {
  /** 图片最大体积 (bytes) */
  IMAGE_MAX_SIZE: 10 * 1024 * 1024,
  /** 音频最大体积 */
  AUDIO_MAX_SIZE: 50 * 1024 * 1024,
  /** 允许的图片 MIME 类型 */
  IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"] as readonly string[],
  /** 允许的音频 MIME 类型 */
  AUDIO_TYPES: ["audio/mpeg", "audio/wav", "audio/ogg"] as readonly string[],
} as const

// ── 速率限制（毫秒 / 次数）─────────
export const RATE_LIMIT = {
  API:       { windowMs: 60_000,     maxRequests: 60  },
  AUTH:      { windowMs: 60_000,     maxRequests: 5   },
  REGISTER:  { windowMs: 3_600_000,  maxRequests: 3   },
  COMMENT:   { windowMs: 60_000,     maxRequests: 10  },
  UPLOAD:    { windowMs: 3_600_000,  maxRequests: 20  },
  SEARCH:    { windowMs: 60_000,     maxRequests: 30  },
  PASSWORD:  { windowMs: 3_600_000,  maxRequests: 3   },
} as const

// ── Prisma ──────────────────────────
export const PRISMA = {
  /** 长连接部署连接池大小 */
  POOL_SIZE: 10,
  /** Serverless 连接池大小 */
  POOL_SIZE_SERVERLESS: 1,
  /** 连接超时（秒） */
  CONNECT_TIMEOUT: 10,
  /** 连接池等待超时（秒） */
  POOL_TIMEOUT: 20,
} as const

// ── 存储 ────────────────────────────
export const STORAGE = {
  /** R2 Cache-Control header */
  CACHE_CONTROL: "public, max-age=31536000, immutable",
} as const

// ── 公告 ────────────────────────────
export const ANNOUNCEMENT = {
  TITLE_MAX: 200,
  CONTENT_MAX: 5000,
} as const

// ── 邮件 ────────────────────────────
export const EMAIL = {
  /** 默认发件邮箱 */
  DEFAULT_FROM_EMAIL: "noreply@example.com",
} as const

// ── 成就 ────────────────────────────
export const ACHIEVEMENT = {
  /** 成就检查时取的最大数量 */
  MAX_CHECK: 60,
} as const
