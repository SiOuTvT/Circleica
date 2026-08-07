export default function GalvelicaLoading() {
  return (
    <div className="galvelica-root mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
      {/* 头部骨架 */}
      <div className="rounded-3xl border border-[color-mix(in_srgb,var(--gal-accent)_30%,transparent)] border-b-2 border-b-[color-mix(in_srgb,var(--gal-accent)_52%,transparent)] p-6 sm:p-9" style={{ background: "var(--gal-paper)" }}>
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        <div className="mt-3 h-8 w-2/3 rounded bg-muted animate-pulse" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-muted animate-pulse" />
        <div className="mt-5 h-11 w-full max-w-md rounded-xl bg-muted animate-pulse" />
      </div>

      {/* 卡片网格骨架 */}
      <div>
        <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        <div className="galvelica-rule mb-4 mt-2" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="galvelica-card overflow-hidden rounded-2xl">
              <div className="aspect-[3/4] w-full animate-pulse bg-muted" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
