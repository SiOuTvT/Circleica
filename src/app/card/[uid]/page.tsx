import { getCardData, serverProxyImg } from "@/lib/card-data"
import { prisma } from "@/lib/prisma"
import { ROLE_META } from "@/lib/permissions"
import { notFound } from "next/navigation"
import type { UserRole } from "@prisma/client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Galgame 品味名片", description: "Circleica · Galvelica 个人品味档案" }

const CARD_W = 720
const SAFE = 44
const CONTENT_W = CARD_W - SAFE * 2
const tintToPaper = (hex: string) => {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16) || 76
  const g = parseInt(c.substring(2, 4), 16) || 126
  const b = parseInt(c.substring(4, 6), 16) || 150
  const mix = (v: number) => Math.round(v + (248 - v) * 0.9)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
const glowGradient = (hex: string, alpha = 0.05) => {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16) || 76
  const g = parseInt(c.substring(2, 4), 16) || 126
  const b = parseInt(c.substring(4, 6), 16) || 150
  return `radial-gradient(circle at 18% 12%, rgba(${r},${g},${b},${alpha}) 0%, transparent 55%)`
}

const heatColors = ["#eef0f4", "#d8f0e9", "#b0e0d3", "#7cc8b4", "#4fa896"]

export default async function CardPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params
  const uidVal = String(uid)

  // 解析 uid：serialId（纯数字）或 uid 字符串
  const isNumeric = /^\d+$/.test(uidVal)
  const user = isNumeric
    ? await prisma.user.findUnique({ where: { serialId: Number(uidVal) }, select: { id: true } })
    : await prisma.user.findFirst({ where: { uid: uidVal }, select: { id: true } })
  if (!user) notFound()

  const data = await getCardData(user.id)
  if (!data) notFound()

  const roleLabel = ROLE_META[(data.role as UserRole)]?.label ?? ""
  const sinceYear = new Date(data.createdAt).getFullYear()
  const initials = data.username[0]?.toUpperCase() || "?"
  const themeHex = "#5FA8A0" // 分享页固定主题色（服务端无 CSS 变量，用默认薄荷绿）
  const avatarSrc = serverProxyImg(data.composedAvatarUrl || data.avatar || "")
  const frameSrc = serverProxyImg(data.avatarFrameUrl)
  const heat = data.checkinHeat
  const hasCheckin = heat.some((v) => v > 0)
  const years = data.favoriteYears.filter((y) => y.year > 1970)
  const showYearStrip = years.length >= 3
  const tags = data.favoriteTags.slice(0, 5)
  const studios = data.favoriteStudios.filter((s) => s.displayName)
  const platforms = data.favoritePlatforms.filter((p) => p.platform)
  const collections = data.collections.filter((c) => c.covers.some((cv) => cv))
  const achievements = data.achievements.filter((a) => a.icon)
  const marks = data.marksTotal
  const n = Math.min(data.favoriteGames.filter((g) => !g.isNsfw && g.coverImage).length, 8)
  const renderCovers = data.favoriteGames.filter((g) => !g.isNsfw && g.coverImage).slice(0, 8)
  const upperN = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3
  const lowerN = Math.max(0, n - upperN)

  function Cover({ src, w, h, rotate = 0 }: { src: string | null; w: number; h: number; rotate?: number }) {
    return (
      <div style={{ padding: 3, background: "#fff", borderRadius: 8, width: w, boxShadow: "0 2px 5px rgba(35,45,65,0.10), 0 8px 16px rgba(35,45,65,0.07)", border: "1px solid rgba(40,50,70,0.10)", transform: `rotate(${rotate}deg)`, transformOrigin: "center bottom" }}>
        <div style={{ width: w, height: h, borderRadius: 4, overflow: "hidden", background: "#f0f1f5" }}>
          {src ? <img src={serverProxyImg(src)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /> : null}
        </div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: "100vh", background: "#e8eaef", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px", fontFamily: "'Noto Sans SC','Segoe UI','Microsoft YaHei',sans-serif" }}>
      <div style={{ width: 400, marginBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#232830", margin: 0 }}>{data.username} 的 Galgame 品味名片</h1>
        <p style={{ fontSize: 12, color: "#8a93a5", marginTop: 6 }}>
          Circleica · Galvelica · 名片 ID {data.serialId}
        </p>
      </div>

      {/* ═══ 名片（720×1280 静态渲染） ═══ */}
      <div style={{ width: CARD_W, height: 1280, position: "relative", overflow: "hidden", borderRadius: 28, background: `linear-gradient(160deg, ${tintToPaper(themeHex)} 0%, #F8F7F3 45%, ${tintToPaper(themeHex)} 100%)`, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", boxSizing: "border-box", display: "flex", flexDirection: "column", padding: `${SAFE}px`, color: "#232830" }}>
        {/* 背景氛围 */}
        <div style={{ position: "absolute", inset: 0, background: glowGradient(themeHex, 0.05), pointerEvents: "none", zIndex: 0 }} />
        {data.banner && <img src={serverProxyImg(data.banner)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", zIndex: 0, opacity: 0.1 }} />}

        {/* ① Identity */}
        <div style={{ height: 152, flexShrink: 0, position: "relative", zIndex: 1 }}>
          <div style={{ position: "absolute", left: 0, top: 12, width: 112, height: 112 }}>
            <div style={{ position: "absolute", left: 17, top: 17, width: 78, height: 78, borderRadius: "50%", background: "#fff", border: "1px solid rgba(40,50,70,0.08)", overflow: "hidden" }}>
              {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#5FA8A0,#8f6fd8)", color: "#fff", fontSize: 30, fontWeight: 700 }}>{initials}</div>}
            </div>
            {frameSrc && <img src={frameSrc} alt="" style={{ position: "absolute", left: 0, top: 0, width: 112, height: 112, objectFit: "contain", borderRadius: "50%", pointerEvents: "none" }} />}
          </div>
          <div style={{ position: "absolute", left: 128, top: 14, right: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#232830" }}>{data.username}</span>
              {roleLabel && <span style={{ padding: "2px 10px", borderRadius: 10, background: "rgba(95,168,160,0.12)", border: "1px solid rgba(95,168,160,0.28)", color: "rgba(60,120,110,0.9)", fontSize: 10, fontWeight: 700 }}>{roleLabel}</span>}
            </div>
            <div style={{ marginTop: 4, display: "flex", gap: 8, color: "rgba(40,50,70,0.40)", fontSize: 10 }}>
              <span>ID {data.uid}</span><span>·</span><span>SINCE {sinceYear}</span>
            </div>
            {data.bio && <div style={{ marginTop: 8, color: "rgba(40,50,70,0.58)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.bio.slice(0, 48)}</div>}
          </div>
        </div>

        {/* ② Archive Strip */}
        <div style={{ height: 58, flexShrink: 0, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", height: "100%", background: "rgba(255,255,255,0.5)", border: "1px solid rgba(40,50,70,0.06)", borderRadius: 12, padding: "0 14px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>COLLECTION</span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{data.favoriteTotal} <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(40,50,70,0.45)" }}>WORKS</span></span>
            </div>
            <div style={{ width: 1, height: 30, background: "rgba(40,50,70,0.08)", margin: "0 12px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>CHECK-IN</span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{hasCheckin ? heat.filter((v) => v > 0).length : 0} <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(40,50,70,0.45)" }}>DAYS</span></span>
            </div>
            {marks > 0 && (<><div style={{ width: 1, height: 30, background: "rgba(40,50,70,0.08)", margin: "0 12px" }} /><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>MARKS</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#a06a20", lineHeight: 1 }}>{marks}</span>
            </div></>)}
            <div style={{ width: 1, height: 30, background: "rgba(40,50,70,0.08)", margin: "0 12px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>SINCE</span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{sinceYear}</span>
            </div>
          </div>
        </div>

        {/* ③ Taste Summary */}
        <div style={{ height: 140, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
          <div style={{ height: 1, background: "rgba(40,50,70,0.08)" }} />
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            <div style={{ flex: studios.length > 0 ? 1.4 : 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>TOP TAGS</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tags.length === 0 && <span style={{ fontSize: 11, color: "rgba(40,50,70,0.35)" }}>—</span>}
                {tags.map((t) => {
                  const maxCount = Math.max(1, ...tags.map((x) => x.count))
                  const weight = t.count / maxCount
                  return (
                    <span key={t.name} style={{ padding: `${weight >= 0.6 ? 4 : 3}px ${weight >= 0.6 ? 12 : 10}px`, borderRadius: 999, fontSize: weight >= 0.9 ? 13 : weight >= 0.6 ? 12 : 11, fontWeight: weight >= 0.9 ? 700 : 600, color: t.color, background: `${t.color}16`, border: `1px solid ${t.color}28` }}>{t.name}<span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>×{t.count}</span></span>
                  )
                })}
              </div>
            </div>
            {studios.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>PREFERRED STUDIO</div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {studios.slice(0, 3).map((s, i) => (
                    <div key={s.displayName} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 20, textAlign: "right", fontSize: 11, fontWeight: 800, color: i === 0 ? themeHex : "rgba(40,50,70,0.5)" }}>#{i + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#3a4356", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.displayName}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(40,50,70,0.4)" }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ④ Collection Index */}
        {collections.length > 0 && (
          <div style={{ height: 156, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
            <div style={{ height: 1, background: "rgba(40,50,70,0.08)" }} />
            <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>COLLECTIONS</div>
            <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
              {collections.slice(0, 2).map((c) => (
                <div key={c.id} style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(40,50,70,0.08)" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {c.covers.filter(Boolean).slice(0, 3).map((cv, ci) => (
                      <div key={ci} style={{ flex: 1, height: 56, borderRadius: 4, overflow: "hidden", background: "#eef0f4" }}>
                        {cv && <img src={serverProxyImg(cv)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#3a4356", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(40,50,70,0.40)", marginTop: 2 }}>{c.count} WORKS</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ⑤ Bookshelf */}
        {n > 0 && (
          <div style={{ height: 320, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
            <div style={{ height: 1, background: "rgba(40,50,70,0.08)" }} />
            <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>
              MY COLLECTION {data.favoriteTotal > n && <span style={{ fontSize: 9, color: "rgba(40,50,70,0.40)" }}>+{data.favoriteTotal - n} MORE</span>}
            </div>
            <div style={{ position: "relative", height: 240, marginTop: 8 }}>
              {renderCovers.slice(0, upperN).map((g, i) => {
                if (n === 1) return <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2, top: 8, zIndex: 2 }}><Cover src={g.coverImage} w={170} h={250} /></div>
                if (n === 2) return i === 0
                  ? <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 + 30, top: 8, zIndex: 2 }}><Cover src={g.coverImage} w={170} h={250} rotate={1.2} /></div>
                  : <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 - 120, top: 16, zIndex: 1 }}><Cover src={g.coverImage} w={108} h={160} rotate={-12} /></div>
                if (i === 0) return <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 + 30, top: 8, zIndex: 3 }}><Cover src={g.coverImage} w={170} h={250} rotate={1.5} /></div>
                if (i === 1) return <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 - 125, top: 14, zIndex: 2 }}><Cover src={g.coverImage} w={108} h={160} rotate={-13} /></div>
                return <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 + 160, top: 20, zIndex: 2 }}><Cover src={g.coverImage} w={100} h={150} rotate={10} /></div>
              })}
            </div>
            {lowerN > 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: -6 }}>
                {renderCovers.slice(upperN).map((g, i) => {
                  const w = Math.min(86, (CONTENT_W - (lowerN - 1) * 10) / lowerN)
                  return <div key={g.id}><Cover src={g.coverImage} w={w} h={Math.round(w * 1.55)} rotate={(i % 2 === 0 ? 1 : -1) * 0.8} /></div>
                })}
              </div>
            )}
          </div>
        )}

        {/* ⑥ Credentials */}
        <div style={{ height: 154, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
          <div style={{ height: 1, background: "rgba(40,50,70,0.08)" }} />
          {hasCheckin && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>CHECK-IN · LAST 30 DAYS</div>
              <div style={{ marginTop: 8, display: "flex", gap: 2 }}>
                {heat.map((v, i) => {
                  const level = v === 0 ? 0 : v >= 8 ? 4 : v >= 5 ? 3 : v >= 2 ? 2 : 1
                  return <div key={i} style={{ flex: 1, height: 14, borderRadius: 2, background: heatColors[level], border: "1px solid rgba(40,50,70,0.04)" }} />
                })}
              </div>
            </div>
          )}
          {achievements.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>ACHIEVEMENTS</div>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                {achievements.slice(0, 6).map((a) => (
                  <div key={a.id} title={a.name} style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${themeHex}25, ${themeHex}08)`, border: "1px solid rgba(40,50,70,0.10)" }}>
                    {a.icon && <img src={serverProxyImg(a.icon)} alt={a.name} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ⑦ Taste Details */}
        <div style={{ height: 146, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
          <div style={{ height: 1, background: "rgba(40,50,70,0.08)" }} />
          {showYearStrip && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>RELEASE YEARS</div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "flex-end", gap: 4, height: 34 }}>
                {years.map((y) => {
                  const maxCount = Math.max(1, ...years.map((x) => x.count))
                  const h = 10 + Math.round((y.count / maxCount) * 22)
                  return (
                    <div key={y.year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ width: 14, height: h, borderRadius: 3, background: `linear-gradient(180deg, ${themeHex}, ${tintToPaper(themeHex)})` }} />
                      <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(40,50,70,0.5)" }}>{y.year.toString().slice(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {platforms.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>PLATFORMS</div>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                {platforms.slice(0, 3).map((p) => (
                  <span key={p.platform} style={{ padding: "2px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "rgba(40,50,70,0.6)", background: "rgba(40,50,70,0.06)", border: "1px solid rgba(40,50,70,0.08)" }}>{p.platform.toUpperCase()}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ⑧ Brand */}
        <div style={{ height: 66, flexShrink: 0, position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "rgba(40,50,70,0.30)", fontSize: 9, fontWeight: 600, letterSpacing: 8 }}>GALVELICA</span>
        </div>
      </div>

      <div style={{ width: 400, marginTop: 20, textAlign: "center", fontSize: 12, color: "#8a93a5" }}>
        由 Circleica 生成 · <a href="/" style={{ color: "#5FA8A0" }}>去主站看看</a> · <a href="/galvelica" style={{ color: "#8f6fd8" }}>浏览资料馆</a>
      </div>
    </main>
  )
}
