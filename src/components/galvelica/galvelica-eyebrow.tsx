/**
 * 副站详情页眉标（GALVELICA 作品 / 标签 / 社团 / 年份）。
 * 四张详情页共用同一套样式（13px / 字距 0.28em / 字重 500 / 铜绿）。
 * 字号走副站五档里的 eyebrow（= 13px，11px 档已取消）。
 * 详情页在 GalvelicaBackLink 之下，传入 className="mt-3" 与标题拉开间距。
 *
 * 注意：不能用 cn / tailwind-merge 合并——tailwind-merge 会把 text-* 字号类
 * 与 text-[var(--gal-accent)] 判成同组冲突而吞掉其一，导致字号回退成继承值。
 * 这里用字符串拼接，确保字号档始终保留（galvelica-fs-* 不是 text-* 工具类，
 * 与颜色类不会互斥，但保持拼接写法以免日后改回 text-* 又踩同一个坑）。
 */
export function GalvelicaEyebrow({ text, className }: { text: string; className?: string }) {
  const base = "galvelica-fs-eyebrow font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]"
  return <p className={className ? `${base} ${className}` : base}>{text}</p>
}
