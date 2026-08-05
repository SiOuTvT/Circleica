/**
 * ArchiveHeroSkeleton —— ArchiveHero「浏览页变体」的骨架双胞胎。
 *
 * 四类 Archive（studio / creator / collection / tag）的 loading.tsx 共用这一份，
 * 同源由代码保证，不再靠各页手抄一遍页头骨架 —— 之前 collection / tag 手抄的版本
 * 写的是 `h-12 w-12 sm:h-14 sm:w-14`，注释却声称「与真实 ArchiveHero 一致」，
 * 实际真实节点是 h-12 的容器套 h-6 w-6 的矢量图标，骨架整整大了一圈，
 * 且四页都漏了 meta 行（「共 N 个制作组」），换成真实页头时会抖一下。
 *
 * 每个占位块都对齐 archive-hero.tsx 浏览页分支的真实节点：
 *   图标    div.flex.h-12.w-fit  >  Icon.h-6.w-6.sm:h-7.sm:w-7
 *   文字列  div.min-w-0.flex-1（图标右侧，与真实页头共用同一条左基准线）
 *     eyebrow p.text-xs.mb-1.5                    → 行高 16px
 *     标题    h1.text-xl.sm:text-2xl.leading-tight → 25px / 30px
 *     lede    p.mt-2.text-sm.sm:text-[15px]        → 22.75px / 24.4px
 *     meta    div.mt-3.text-sm                    → 20px
 *   搜索    HeaderSearch：作为 header 直接子节点、全宽，py-2.5 + text-sm = 40px，max-w-md
 *
 * 与真实页头一致：eyebrow/标题/lede/meta 全在文字列内（共用图标右侧一条左基准线），
 * 仅搜索区为外层直接子节点；外层 gap-4 与 header 的 `flex flex-col gap-4` 对齐。
 */
export function ArchiveHeroSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="flex items-start gap-4">
        {/* 图标位：容器高 h-12，内部矢量图标 h-6 w-6 sm:h-7 sm:w-7，无灰底框 */}
        <div className="flex h-12 w-fit shrink-0 items-center justify-center">
          <div className="h-6 w-6 animate-pulse rounded bg-muted/60 sm:h-7 sm:w-7" />
        </div>
        {/* 文字列：eyebrow + 标题 + lede + meta 与真实页头一致，共用图标右侧这一条左基准线 */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 h-4 w-20 animate-pulse rounded bg-muted/60" />
          <div className="h-[25px] w-36 animate-pulse rounded bg-muted/60 sm:h-[30px] sm:w-44" />
          <div className="mt-2 h-[23px] w-full max-w-prose animate-pulse rounded bg-muted/60 sm:h-6" />
          <div className="mt-3 h-5 w-28 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
      {/* 搜索区与真实页头一致：作为外层直接子节点、全宽，不属于文字列 */}
      <div className="mt-1 h-10 w-full max-w-md animate-pulse rounded-xl bg-muted/40" />
    </div>
  )
}
