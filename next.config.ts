import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // UploadThing CDN (文件上传服务)
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      // VNDB (视觉小说数据库)
      { protocol: "https", hostname: "static.vndb.org" },
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
  // 启用 gzip/brotli 压缩
  compress: true,
  // 忽略可选依赖的类型检查错误
  typescript: {
    ignoreBuildErrors: false, // 保持严格检查，但通过 tsconfig 排除特定模块
  },
  // 实验性优化
  experimental: {
    // 优化 CSS 打包
    optimizeCss: true,
  },
};

export default nextConfig;
