import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/uploads/**" },
    ],
    remotePatterns: [
      // Cloudflare R2 (图片/文件存储)
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
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
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  output: "standalone",

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Forwarded-Proto", value: "http" }],
      },
    ];
  },

  compress: true,
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: false,
  allowedDevOrigins: ["192.168.5.53", "192.168.*", "10.*"],

  // 显式启用 Turbopack（Next.js 16 默认），消除 webpack 兼容警告
  turbopack: {},

  // 仅在生产构建（webpack）时生效，Turbopack（dev）忽略此配置
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "isomorphic-dompurify": "dompurify",
      }
    }
    return config
  },
};

// 开发环境完全不 import @sentry/nextjs，避免加载 OpenTelemetry 等重依赖
async function withSentry(config: NextConfig): Promise<NextConfig> {
  const { withSentryConfig } = await import("@sentry/nextjs");
  return withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    widenClientFileUpload: true,
    sourcemaps: { deleteSourcemapsAfterUpload: true },
    tunnelRoute: "/api/sentry/tunnel",
  });
}

const configPromise = process.env.NODE_ENV === "development"
  ? Promise.resolve(nextConfig)
  : withSentry(nextConfig);

export default configPromise;
