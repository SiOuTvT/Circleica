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
    // 不允许 SVG 经 next/image 优化：SVG 可内嵌 <script>/<foreignObject> 执行脚本，
    // 若经此通道服务用户上传内容将构成存储型 XSS。全站唯一 SVG 用法是 setup-wizard
    // 中下拉箭头的 CSS background-image data URI，不经过 next/image，关闭不影响功能。
    dangerouslyAllowSVG: false,
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

  // ⚠️ 退出 Turbopack，改用 Webpack：Next.js 16 的 Turbopack 在 Windows 上有已知 bug
  // —— dev 时会在项目根目录生成 nul 空文件、并偶发 panic 导致页面停在旧缓存(用户 2026-07-30 踩坑)。
  // 同时本项目含自定义 webpack 配置(dompurify 别名)，Turbopack 会忽略它，必须走 --webpack。
  // 对应标志已在 package.json 的 dev / build 脚本中加 --webpack。

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
