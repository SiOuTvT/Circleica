import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    localPatterns: [
      { pathname: "/uploads/**" },
    ],
    remotePatterns: [
      // Cloudflare R2 (图片/文件存储)
      // R2 公开访问域名（pub-xxxx.r2.dev）
      { protocol: "https", hostname: "*.r2.dev" },
      // R2 S3 API 域名
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      // 如果 R2_PUBLIC_URL 使用的是自定义域名（如 assets.example.com），
      // 请在此处添加对应的 remotePattern：
      // { protocol: "https", hostname: "assets.example.com" },
      // UploadThing
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "uploadthing.com" },
      // VNDB (视觉小说数据库)
      { protocol: "https", hostname: "static.vndb.org" },
      { protocol: "https", hostname: "t.vndb.org" },
      // 本地开发允许 localhost
      ...(process.env.NODE_ENV === "development"
        ? [{ protocol: "http" as const, hostname: "localhost" }]
        : []),
    ],
    // 使用 WebP/AVIF 格式自动优化，减少传输体积
    formats: ["image/avif", "image/webp"],
  },
  // 移除 X-Powered-By 头，减少信息泄露
  poweredByHeader: false,
  // Docker 部署：生成独立运行包
  output: "standalone",

  async headers() {
    return [
      {
        // 对所有页面强制覆盖 CSP，移除 upgrade-insecure-requests（HTTP 站点不需要）
        source: "/(.*)",
        headers: [
          {
            key: "X-Forwarded-Proto",
            value: "http",
          },
        ],
      },
    ];
  },

  // 告诉 Sentry 不要添加安全头（我们自己控制）
  // 启用 gzip/brotli 压缩
  compress: true,
  // 忽略可选依赖的类型检查错误
  typescript: {
    ignoreBuildErrors: false, // 保持严格检查，但通过 tsconfig 排除特定模块
  },
  // 关闭 StrictMode（开发环境双重渲染影响调试体验）
  reactStrictMode: false,
  // 允许局域网设备访问开发服务器（手机/平板等）
  allowedDevOrigins: ["192.168.5.53", "192.168.*", "10.*"],

  // 显式启用 Turbopack（Next.js 16 默认），消除 webpack 兼容警告
  turbopack: {},

  webpack(config, { isServer }) {
    // 客户端构建时将 isomorphic-dompurify 替换为轻量 dompurify（~10KB vs ~500KB jsdom）
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "isomorphic-dompurify": "dompurify",
      }
    }
    return config
  },
};

// 开发环境跳过 Sentry 包装，避免 OpenTelemetry + webpack 插件导致内存耗尽
export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withSentryConfig(nextConfig, {
  // Sentry 构建时配置
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // 仅在有 auth token 时上传 sourcemap
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  
  // 上传 sourcemap 的目录
  widenClientFileUpload: true,
  
  // 上传后删除 sourcemap
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  
  // tunnel 路由，绕过广告拦截器
  tunnelRoute: "/api/sentry/tunnel",
});
