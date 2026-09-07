/**
 * 副站详情页眉标（GALVELICA 作品 / 标签 / 社团 / 年份）。
 * 四张详情页共用同一套样式（11px / 字距 0.28em / 字重 500 / 铜绿）。
 * 详情页在 GalvelicaBackLink 之下，传入 className="mt-3" 与标题拉开间距。
 *
 * 注意：不能用 cn / tailwind-merge 合并——tailwind-merge 会把 text-caption
 * 当成 text-* 工具类、与 text-[var(--gal-accent)] 同组冲突而吞掉，导致字号
 * 回退成 16px。这里用字符串拼接，确保 text-caption 令牌始终保留。
 */
export function GalvelicaEyebrow({ text, className }: { text: string; className?: string }) {
  const base = "text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]"
  return <p className={className ? `${base} ${className}` : base}>{text}</p>
}
