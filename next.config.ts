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
  // 显式关闭 StrictMode，避免生产环境双重渲染
  reactStrictMode: false,
};

export default withSentryConfig(nextConfig, {
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
