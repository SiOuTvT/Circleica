import Link from "next/link"
import { GalvelicaNav } from "./galvelica-nav"
import { GalvelicaSearch } from "./galvelica-search"
import { GalvelicaHeaderTools } from "./galvelica-header-tools"

/**
 * Galvelica 子站 Header · 档案刊头（变体 C）。
 * 大字标(衬线) + 标语 + 铜绿发丝线 + 索引导航行 + 右侧检索/主题/NSFW/真人3D/返回主站。
 * 不再重复渲染品牌字标（品牌仅在刊头一次出现）；移动端检索常显。
 */
export async function GalvelicaHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--gal-accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_90%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_74%,transparent)]">
      {/* 刊头主体：字标 + 标语 + 右侧工具 */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/galvelica" className="group inline-flex shrink-0 flex-col leading-none">
          <span className="galvelica-wordmark galvelica-serif text-xl font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
            Galvelica
          </span>
          <span className="mt-0.5 hidden text-micro font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)] sm:block sm:text-caption">
            同人视觉小说资料库 · Archive
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <GalvelicaSearch className="block min-w-0 flex-1 sm:flex-none sm:w-44 lg:w-52" />
          <GalvelicaHeaderTools />
        </div>
      </div>

      {/* 铜绿发丝线 */}
      <div className="h-px w-full bg-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)]" />

      {/* 索引导航行：移动端单行横向滚动，避免换行占掉半屏；桌面端正常换行 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <GalvelicaNav className="flex-nowrap overflow-x-auto py-2 sm:flex-wrap sm:overflow-visible" />
      </div>
    </header>
  )
}
