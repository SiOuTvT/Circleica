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
      { protocol: "https", hostname: "s.vndb.org" },
      // 其他已入库图床（历史封面回源）
      { protocol: "https", hostname: "shared.cdn.queniuqe.com" },
      { protocol: "https", hostname: "media.st.dl.eccdnx.com" },
      // Steam (发现层封面 header_image)
      { protocol: "https", hostname: "shared.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "store.steampowered.com" },
      // Bangumi (同人闸门已收录)
      { protocol: "https", hostname: "*.bgm.tv" },
      { protocol: "https", hostname: "lain.bgm.tv" },
      // 本地开发允许 localhost
      ...(process.env.NODE_ENV === "development"
        ? [{ protocol: "http" as const, hostname: "localhost" }]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
    // 允许 SVG（示例数据回退层用 data URI SVG 作封面/截图，确保设计预览可见）
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
  poweredByHeader: false,
  output: "standalone",

  // 信任反向代理（nginx/Cloudflare 等）转发的 x-forwarded-* 头：
  // Next.js 16 默认直接读取上游代理写入的 x-forwarded-proto / x-forwarded-for 来判定协议与客户端地址，
  // 旧版 server.trustProxy 选项在 Next 16 已移除（配置无效且会触发类型错误）。
  // 部署在代理后需确保代理正确覆写这些头，否则仍可能错误判断客户端协议，导致 NextAuth/CSRF/重定向异常（H3）。
  // 注意不要自行伪造 X-Forwarded-Proto 响应头，真实协议应由代理填写。

  compress: true,
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
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
