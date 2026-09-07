export default function GalvelicaLoading() {
  return (
    <div className="galvelica-root mx-auto max-w-6xl px-4 sm:px-6">
      {/* 头部骨架 */}
      <div
        className="space-y-3 border-b border-[color-mix(in_srgb,var(--gal-accent)_18%,transparent)] pb-6"
        style={{ background: "var(--gal-sheet)" }}
      >
        <div className="h-3 w-32 animate-pulse bg-muted" />
        <div className="h-8 w-2/3 animate-pulse bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse bg-muted" />
        <div className="h-11 w-full max-w-md animate-pulse bg-muted" />
      </div>

      {/* 卡片网格骨架 */}
      <div>
        <div className="mt-6 h-6 w-40 animate-pulse bg-muted" />
        <div className="mb-4 mt-2 h-px w-full bg-border" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden border border-border">
              <div className="aspect-[3/4] w-full animate-pulse bg-muted" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-4/5 animate-pulse bg-muted" />
                <div className="h-3 w-1/2 animate-pulse bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
