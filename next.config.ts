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

  // 静态路由跳转（M2/M3/M4 图鉴迁移的旧路由别名 + /register 便捷别名）。
  //
  // ⚠️ 必须放在配置层，不能写成页面里的 redirect()/permanentRedirect()：
  // 本应用页面内的 redirect() 在「文档请求（首屏直达）」下会被 Next 以流式 RSC 渲染，
  // layout 外壳已开始以 200 发出，页面再抛 NEXT_REDIRECT 时状态码无法回改，
  // 于是降级成 body 内嵌的 RSC 软跳转指令（`NEXT_REDIRECT;replace;/x;3xx;`，实测 HTTP 层是 200，
  // 由客户端 JS 完成跳转）。这对站点迁移别名是致命的：搜索引擎/无 JS 爬虫拿到的是 200，
  // 永久跳转信号丢失，权重合并慢且不确定。
  // （注：此降级与根级 loading.tsx 无关——移除根级 loading 后 /register 仍为 200 软跳转，
  //  已实测证伪「Suspense 边界是根因」的旧假设；真正原因是流式 RSC 渲染本身。）
  // 配置层 redirects 在文件系统路由之前生效，产出的是真正的 HTTP 308/307，无 JS 依赖。
  //
  // 只有「静态可枚举」的跳转能进这里；依赖 DB 查 slug 的旧详情路由
  // （/creators/[id] /collections/[id] /tags/[id]）与 serialId 归一（/games/[id] /user/[id]）
  // 无法静态化，保留页面内 redirect（软跳转对同资源归一/遗留详情可接受）；
  // 鉴权跳转（/profile /profile/edit /notifications）走 proxy.ts 守卫产出真 307。
  async redirects() {
    return [
      { source: "/credits", destination: "/credits/studio", permanent: true },
      { source: "/creators", destination: "/credits/creator", permanent: true },
      { source: "/collections", destination: "/credits/collection", permanent: true },
      { source: "/tags", destination: "/credits/tag", permanent: true },
      // /register 是登录页注册 tab 的便捷别名，静态且无条件 → 配置层给真 307
      { source: "/register", destination: "/login?tab=register", permanent: false },
    ]
  },

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

// Sentry 仅当配置了 DSN 才注入：未配置时完全不启用 @sentry/nextjs webpack 插件，
// 客户端不再打包 Sentry SDK（省 ~456K 首屏 JS，移动端首屏大头）；服务端 instrumentation.ts 已有同款守卫。
// 开发环境始终跳过（避免 OpenTelemetry 等重依赖拖慢 dev 启动）。
const sentryEnabled = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
const configPromise = process.env.NODE_ENV === "development" || !sentryEnabled
  ? Promise.resolve(nextConfig)
  : withSentry(nextConfig);

export default configPromise;
