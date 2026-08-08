"use client"

import { Download, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { ROLE_META, type UserRole } from "@/lib/permissions"
import html2canvas from "html2canvas"

/* ══════════════════════════════════════════════════════════════
 * v3 固定规格高密度名片（按锁定布局实现）
 *  画布 720×1280 · 安全边距 44 · 内容宽 632
 *  8 个固定 Y 区域，模块隐藏自动收缩
 *  展示封面（≤8）与收藏总量/统计严格分离
 * ══════════════════════════════════════════════════════════════ */

interface FavoriteGame {
  id: string
  title: string
  coverImage: string | null
  serialId: number
  isNsfw: boolean
}

interface FavoriteTag { name: string; color: string; count: number }
interface FavoriteStudio { displayName: string; count: number }
interface FavoriteYear { year: number; count: number }
interface FavoritePlatform { platform: string; count: number }
interface CollectionItem {
  id: string; name: string; description: string | null
  covers: Array<string | null>; count: number
}
interface AchievementItem { id: string; name: string; icon: string | null; category: string }

interface CardData {
  username: string
  uid: string
  avatar: string | null
  composedAvatarUrl: string | null
  banner: string | null
  bio: string
  role: string
  createdAt: string
  avatarFrameUrl?: string
  favoriteGames?: FavoriteGame[]
  favoriteTotal: number
  favoriteTags?: FavoriteTag[]
  favoriteStudios?: FavoriteStudio[]
  favoriteYears?: FavoriteYear[]
  favoritePlatforms?: FavoritePlatform[]
  checkinHeat?: number[]
  marksTotal: number
  collections?: CollectionItem[]
  achievements?: AchievementItem[]
}

/* ── 固定规格常量 ── */
const CARD_W = 720
const CARD_H = 1280
const SAFE = 44
const CONTENT_W = CARD_W - SAFE * 2 // 632
const MAX_COVERS = 8
const MIN_SELECTABLE = 3

/* ── Canvas 预渲染工具 ── */

async function preprocessBanner(src: string, targetW = 360, targetH = 640): Promise<string> {
  try {
    const img = await loadImage(src)
    const canvas = document.createElement("canvas")
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext("2d")
    if (!ctx) return ""
    ctx.filter = "blur(26px) saturate(0.55) brightness(1.22)"
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.drawImage(img, (targetW - w) / 2, (targetH - h) / 2, w, h)
    return canvas.toDataURL("image/png")
  } catch { return "" }
}

let noiseCache: string | null = null
function getNoise(): string {
  if (typeof document === "undefined") return ""
  if (noiseCache) return noiseCache
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  const imgData = ctx.createImageData(size, size)
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 40
    imgData.data[i] = v; imgData.data[i + 1] = v; imgData.data[i + 2] = v
    imgData.data[i + 3] = 24
  }
  ctx.putImageData(imgData, 0, 0)
  noiseCache = canvas.toDataURL("image/png")
  return noiseCache
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.referrerPolicy = "no-referrer"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("load failed"))
    img.src = proxyImg(src)
  })
}

/** 把外部图片 URL 转为本站 CORS 代理地址（本站同源图直接返回原样） */
function proxyImg(src: string): string {
  if (!src) return src
  // 本站 /uploads、data:、blob: 或已是代理的，直接用
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/api/img-proxy")) {
    return src
  }
  // 外部 http(s) 图 → 走代理
  try {
    const u = new URL(src)
    if (u.origin === window.location.origin) return src
    return `/api/img-proxy?url=${encodeURIComponent(src)}`
  } catch {
    return src
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "")
  return [
    parseInt(c.substring(0, 2), 16) || 76,
    parseInt(c.substring(2, 4), 16) || 126,
    parseInt(c.substring(4, 6), 16) || 150,
  ]
}

function tintToPaper(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (v: number) => Math.round(v + (248 - v) * 0.9)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function glowGradient(hex: string, alpha = 0.05): string {
  const [r, g, b] = hexToRgb(hex)
  return `radial-gradient(circle at 18% 12%, rgba(${r},${g},${b},${alpha}) 0%, transparent 55%)`
}

/* 封面实体样式 */
const coverBoxShadow = "0 2px 5px rgba(35,45,65,0.10), 0 8px 16px rgba(35,45,65,0.07)"

/* 模块标题 */
function ModuleLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>
      {text}
    </div>
  )
}

/* 分隔线 */
function Divider() {
  return <div style={{ height: 1, background: "rgba(40,50,70,0.08)" }} />
}

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [avatarError, setAvatarError] = useState(false)
  const [frameError, setFrameError] = useState(false)
  const [coverErrorIds, setCoverErrorIds] = useState<Set<string>>(new Set())
  const [bannerBgData, setBannerBgData] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [themeHex, setThemeHex] = useState("#5FA8A0")

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (typeof window !== "undefined") {
      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
      if (primary) setThemeHex(primary)
    }
  }, [])

  const roleMeta = ROLE_META[(data.role as UserRole)]
  const roleLabel = roleMeta?.label ?? ""
  const initials = data.username[0]?.toUpperCase() || "?"
  const avatarSrc = data.composedAvatarUrl || data.avatar || ""
  const frameSrc = data.avatarFrameUrl || ""

  // ── 数据（展示与统计严格分离） ──
  const safeGames = (data.favoriteGames ?? []).filter((g) => !g.isNsfw)
  const allCovers = safeGames.filter((g) => g.coverImage)
  const favoriteTotal = data.favoriteTotal ?? 0

  function coverFailed(id: string) { return coverErrorIds.has(id) }
  function markCoverFailed(id: string) { setCoverErrorIds((prev) => new Set(prev).add(id)) }

  function openPicker() {
    setSelectedIds(new Set(allCovers.slice(0, MAX_COVERS).map((g) => g.id)))
    setPickerOpen(true)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const chosenCovers = allCovers.filter((g) => selectedIds.has(g.id))
  const chosenN = chosenCovers.length
  const n = chosenN > 0 ? chosenN : Math.min(allCovers.length, MAX_COVERS)
  const renderCovers = chosenN > 0 ? chosenCovers : allCovers.slice(0, MAX_COVERS)

  // ── 数据模块 ──
  const heat = data.checkinHeat ?? []
  const hasCheckin = heat.some((v) => v > 0)
  const years = (data.favoriteYears ?? []).filter((y) => y.year > 1970)
  const showYearStrip = years.length >= 3
  const studios = (data.favoriteStudios ?? []).filter((s) => s.displayName)
  const platforms = (data.favoritePlatforms ?? []).filter((p) => p.platform)
  const collections = (data.collections ?? []).filter((c) => c.covers.some((cv) => cv))
  const achievements = (data.achievements ?? []).filter((a) => a.icon)
  const tags = (data.favoriteTags ?? []).slice(0, 5)
  const marks = data.marksTotal ?? 0
  const sinceYear = new Date(data.createdAt).getFullYear()

  async function generate() {
    if (generating) return
    setGenerating(true)
    try {
      if (avatarSrc) { try { await loadImage(avatarSrc) } catch { setAvatarError(true) } }
      if (frameSrc) { try { await loadImage(frameSrc) } catch { setFrameError(true) } }
      await Promise.all(renderCovers.map(async (g) => {
        if (!g.coverImage) return
        try { await loadImage(g.coverImage) } catch { markCoverFailed(g.id) }
      }))
      const bannerBg = data.banner ? await preprocessBanner(data.banner) : ""
      setBannerBgData(bannerBg)
      getNoise()
      await new Promise((r) => setTimeout(r, 80))

      const node = cardRef.current
      if (!node) throw new Error("card node missing")

      const canvas = await html2canvas(node, {
        scale: 2, backgroundColor: "#F8F7F3",
        useCORS: true, allowTaint: false, logging: false,
      })
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = `${data.username}_名片.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success("名片已生成")
    } catch (e) {
      logger.user.error("[名片生成]", e)
      toast.error("生成失败，请重试")
    } finally { setGenerating(false) }
  }

  /* ── 封面块（固定宽高，contain） ── */
  function Cover({ g, w, h, rotate = 0 }: { g: FavoriteGame; w: number; h: number; rotate?: number }) {
    const ok = !coverFailed(g.id)
    return (
      <div style={{
        padding: 3, background: "#ffffff", borderRadius: 8, width: w,
        boxShadow: coverBoxShadow, border: "1px solid rgba(40,50,70,0.10)",
        transform: `rotate(${rotate}deg)`, transformOrigin: "center bottom",
      }}>
        <div style={{ width: w, height: h, borderRadius: 4, overflow: "hidden", background: "#f0f1f5" }}>
          {g.coverImage && ok ? (
            <img src={proxyImg(g.coverImage)} alt="" onError={() => markCoverFailed(g.id)}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              crossOrigin="anonymous" referrerPolicy="no-referrer" />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(95,168,160,0.10), rgba(168,85,247,0.10))",
              fontSize: 18, fontWeight: 700, color: "rgba(60,70,100,0.35)" }}>{g.title[0] ?? "?"}</div>
          )}
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
   * 8 区域布局（flex column，模块隐藏自动收缩）
   * ═══════════════════════════════════════════════ */
  const card = (
    <div
      ref={cardRef}
      style={{
        width: CARD_W, height: CARD_H, position: "relative", overflow: "hidden",
        fontFamily: "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif",
        color: "#232830", boxSizing: "border-box",
        background: `linear-gradient(160deg, ${tintToPaper(themeHex)} 0%, #F8F7F3 45%, ${tintToPaper(themeHex)} 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(40,50,70,0.08)",
        display: "flex", flexDirection: "column",
        padding: `${SAFE}px`,
        gap: 0,
      }}
    >
      {/* 背景氛围层 */}
      <div style={{ position: "absolute", inset: 0, background: glowGradient(themeHex, 0.05), pointerEvents: "none", zIndex: 0 }} />
      {data.banner && bannerBgData && (
        <img src={bannerBgData} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", zIndex: 0, opacity: 0.85 }} />
      )}
      {getNoise() && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${getNoise()})`, opacity: 0.5, pointerEvents: "none", zIndex: 0 }} />
      )}

      {/* ═══ ① Identity（44-196）═══ */}
      <div style={{ height: 152, flexShrink: 0, position: "relative", zIndex: 1 }}>
        {/* 头像+框 112×112 */}
        <div style={{ position: "absolute", left: 0, top: 12, width: 112, height: 112 }}>
          <div style={{ position: "absolute", left: 17, top: 17, width: 78, height: 78, borderRadius: "50%", background: "#ffffff", border: "1px solid rgba(40,50,70,0.08)", boxShadow: "0 3px 8px rgba(35,45,65,0.12)", overflow: "hidden" }}>
            {avatarSrc && !avatarError ? (
              <img src={proxyImg(avatarSrc)} alt="" onError={() => setAvatarError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #5FA8A0, #8f6fd8)", fontSize: 30, fontWeight: 700, color: "#fff" }}>{initials}</div>
            )}
          </div>
          {frameSrc && !frameError ? (
            <img src={proxyImg(frameSrc)} alt="" onError={() => setFrameError(true)} style={{ position: "absolute", left: 0, top: 0, width: 112, height: 112, objectFit: "contain", boxShadow: "0 4px 10px rgba(35,45,65,0.14)", borderRadius: "50%", pointerEvents: "none" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
          ) : null}
        </div>

        {/* 名牌区 */}
        <div style={{ position: "absolute", left: 128, top: 14, right: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#232830", letterSpacing: 0.5 }}>{data.username}</span>
            {roleLabel && (
              <span style={{ padding: "2px 10px", borderRadius: 10, background: "rgba(95,168,160,0.12)", border: "1px solid rgba(95,168,160,0.28)", color: "rgba(60,120,110,0.9)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{roleLabel}</span>
            )}
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, color: "rgba(40,50,70,0.40)", fontSize: 10 }}>
            <span>ID {data.uid}</span>
            <span>·</span>
            <span>SINCE {sinceYear}</span>
          </div>
          {/* Bio（一行） */}
          {data.bio && (
            <div style={{ marginTop: 8, color: "rgba(40,50,70,0.58)", fontSize: 12, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.bio.slice(0, 48)}</div>
          )}
        </div>
      </div>

      {/* ═══ ② Archive Strip（196-254）═══ */}
      <div style={{ height: 58, flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 0, background: "rgba(255,255,255,0.5)", border: "1px solid rgba(40,50,70,0.06)", borderRadius: 12, padding: "0 14px" }}>
          {/* COLLECTION */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>COLLECTION</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#232830", lineHeight: 1 }}>{favoriteTotal} <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(40,50,70,0.45)", letterSpacing: 0.5 }}>WORKS</span></span>
          </div>
          <div style={{ width: 1, height: 30, background: "rgba(40,50,70,0.08)", margin: "0 12px" }} />
          {/* CHECK-IN 天数 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>CHECK-IN</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#232830", lineHeight: 1 }}>{heat.filter((v) => v > 0).length} <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(40,50,70,0.45)" }}>DAYS</span></span>
          </div>
          <div style={{ width: 1, height: 30, background: "rgba(40,50,70,0.08)", margin: "0 12px" }} />
          {/* MARKS */}
          {marks > 0 && (
            <>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>MARKS</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#a06a20", lineHeight: 1 }}>{marks}</span>
              </div>
              <div style={{ width: 1, height: 30, background: "rgba(40,50,70,0.08)", margin: "0 12px" }} />
            </>
          )}
          {/* SINCE */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "rgba(40,50,70,0.45)" }}>SINCE</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#232830", lineHeight: 1 }}>{sinceYear}</span>
          </div>
        </div>
      </div>

      {/* ═══ ③ Taste Summary（254-394）═══ */}
      <div style={{ height: 140, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
        <Divider />
        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          {/* 左：TOP TAGS（权重展示） */}
          <div style={{ flex: studios.length > 0 ? 1.4 : 1, minWidth: 0 }}>
            <ModuleLabel text="TOP TAGS" />
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
              {tags.length === 0 && <span style={{ fontSize: 11, color: "rgba(40,50,70,0.35)" }}>—</span>}
              {tags.map((t) => {
                const maxCount = Math.max(1, ...tags.map((x) => x.count))
                const weight = t.count / maxCount
                const size = weight >= 0.9 ? 13 : weight >= 0.6 ? 12 : 11
                const opacity = weight >= 0.6 ? 1 : 0.75
                return (
                  <span key={t.name} style={{
                    padding: `${weight >= 0.6 ? 4 : 3}px ${weight >= 0.6 ? 12 : 10}px`,
                    borderRadius: 999, fontSize: size, fontWeight: weight >= 0.9 ? 700 : 600,
                    color: t.color, background: `${t.color}16`, border: `1px solid ${t.color}28`, opacity,
                  }}>{t.name}<span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>×{t.count}</span></span>
                )
              })}
            </div>
          </div>
          {/* 右：PREFERRED STUDIO（无则隐藏，左扩展） */}
          {studios.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <ModuleLabel text="PREFERRED STUDIO" />
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

      {/* ═══ ④ Collection Index（394-550）═══ */}
      {collections.length > 0 && (
        <div style={{ height: 156, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
          <Divider />
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <ModuleLabel text="COLLECTIONS" />
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
            {collections.slice(0, 2).map((c) => (
              <div key={c.id} style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(40,50,70,0.08)", boxShadow: "0 2px 6px rgba(35,45,65,0.05)" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {c.covers.filter(Boolean).slice(0, 3).map((cv, ci) => (
                    <div key={ci} style={{ flex: 1, height: 56, borderRadius: 4, overflow: "hidden", background: "#eef0f4" }}>
                      {cv && <img src={proxyImg(cv)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />}
                    </div>
                  ))}
                  {c.covers.filter(Boolean).length === 0 && (
                    <div style={{ flex: 1, height: 56, borderRadius: 4, background: "linear-gradient(135deg, rgba(95,168,160,0.10), rgba(168,85,247,0.10))" }} />
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#3a4356", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "rgba(40,50,70,0.40)", marginTop: 2 }}>{c.count} WORKS</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ⑤ Bookshelf（550-870）═══ */}
      {n > 0 && (
        <div style={{ height: 320, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
          <Divider />
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <ModuleLabel text="MY COLLECTION" />
            {favoriteTotal > n && (
              <span style={{ fontSize: 9, color: "rgba(40,50,70,0.40)" }}>+{favoriteTotal - n} MORE</span>
            )}
          </div>
          {/* 上层：1大 + 2小（叠放） */}
          <div style={{ position: "relative", height: 240, marginTop: 8 }}>
            {renderCovers.slice(0, Math.min(3, n)).map((g, i) => {
              if (n === 1) {
                return (
                  <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2, top: 8, zIndex: 2 }}>
                    <Cover g={g} w={170} h={250} rotate={0} />
                  </div>
                )
              }
              if (n === 2) {
                return i === 0 ? (
                  <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 + 30, top: 8, zIndex: 2 }}>
                    <Cover g={g} w={170} h={250} rotate={1.2} />
                  </div>
                ) : (
                  <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 - 120, top: 16, zIndex: 1 }}>
                    <Cover g={g} w={108} h={160} rotate={-12} />
                  </div>
                )
              }
              // n >= 3
              if (i === 0) return (
                <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 + 30, top: 8, zIndex: 3 }}>
                  <Cover g={g} w={170} h={250} rotate={1.5} />
                </div>
              )
              if (i === 1) return (
                <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 - 125, top: 14, zIndex: 2 }}>
                  <Cover g={g} w={108} h={160} rotate={-13} />
                </div>
              )
              return (
                <div key={g.id} style={{ position: "absolute", left: (CONTENT_W - 170) / 2 + 160, top: 20, zIndex: 2 }}>
                  <Cover g={g} w={100} h={150} rotate={10} />
                </div>
              )
            })}
          </div>
          {/* 下层：剩余紧凑排列 */}
          {n > 3 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: -6 }}>
              {renderCovers.slice(3).map((g, i) => {
                const w = Math.min(86, (CONTENT_W - (n - 4) * 10) / (n - 3))
                return (
                  <div key={g.id}>
                    <Cover g={g} w={w} h={Math.round(w * 1.55)} rotate={(i % 2 === 0 ? 1 : -1) * 0.8} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ ⑥ Credentials（870-1024）═══ */}
      <div style={{ height: 154, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
        <Divider />
        {/* CHECK-IN 热力条 */}
        {hasCheckin && (
          <div style={{ marginTop: 10 }}>
            <ModuleLabel text="CHECK-IN · LAST 30 DAYS" />
            <div style={{ marginTop: 8, display: "flex", gap: 2 }}>
              {heat.map((v, i) => {
                const level = v === 0 ? 0 : v >= 8 ? 4 : v >= 5 ? 3 : v >= 2 ? 2 : 1
                const colors = ["#eef0f4", "#d8f0e9", "#b0e0d3", "#7cc8b4", "#4fa896"]
                return <div key={i} style={{ flex: 1, height: 14, borderRadius: 2, background: colors[level], border: "1px solid rgba(40,50,70,0.04)" }} />
              })}
            </div>
          </div>
        )}
        {/* ACHIEVEMENT 徽章（无则隐藏） */}
        {achievements.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <ModuleLabel text="ACHIEVEMENTS" />
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              {achievements.slice(0, 6).map((a) => (
                <div key={a.id} title={a.name} style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${themeHex}25, ${themeHex}08)`, border: "1px solid rgba(40,50,70,0.10)" }}>
                  {a.icon ? <img src={proxyImg(a.icon)} alt={a.name} style={{ width: 18, height: 18, objectFit: "contain" }} crossOrigin="anonymous" referrerPolicy="no-referrer" /> : <span style={{ fontSize: 12 }}>🏅</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ ⑦ Taste Details（1024-1170）═══ */}
      <div style={{ height: 146, flexShrink: 0, position: "relative", zIndex: 1, paddingTop: 16 }}>
        <Divider />
        {/* 年份微分布 */}
        {showYearStrip && (
          <div style={{ marginTop: 10 }}>
            <ModuleLabel text="RELEASE YEARS" />
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
        {/* Platform（不足隐藏） */}
        {platforms.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <ModuleLabel text="PLATFORMS" />
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              {platforms.slice(0, 3).map((p) => (
                <span key={p.platform} style={{ padding: "2px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "rgba(40,50,70,0.6)", background: "rgba(40,50,70,0.06)", border: "1px solid rgba(40,50,70,0.08)" }}>{p.platform.toUpperCase()}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ ⑧ Brand（1170-1236）═══ */}
      <div style={{ height: 66, flexShrink: 0, position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(40,50,70,0.30)", fontSize: 9, fontWeight: 600, letterSpacing: 8 }}>GALVELICA</span>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={openPicker}
        type="button"
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
      >
        {generating ? <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2} /> : <Download className="h-5 w-5 text-muted-foreground" strokeWidth={2} />}
        <span className="text-xs font-medium text-foreground">{generating ? "生成中…" : "生成名片"}</span>
      </button>

      {/* 封面选择弹窗 + 实时预览 */}
      {pickerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPickerOpen(false)}>
          <div style={{ width: "100%", maxWidth: 900, maxHeight: "90vh", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.2)", display: "flex", gap: 20, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            {/* 左侧：封面选择 */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#232830", margin: 0 }}>选择代表收藏</h3>
              <p style={{ fontSize: 12, color: "#9aa3b5", marginTop: 4 }}>
                选择 3-8 张封面（总收藏 {favoriteTotal} 部，展示只是代表品味）
              </p>
              <div style={{ overflowY: "auto", flex: 1, marginTop: 12, paddingRight: 4 }}>
                {allCovers.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#b3bac9", fontSize: 13 }}>
                    收藏中还没有可展示的封面（NSFW 已自动排除）
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {allCovers.map((g) => {
                      const sel = selectedIds.has(g.id)
                      return (
                        <button key={g.id} type="button" onClick={() => toggleSelect(g.id)} style={{
                          position: "relative", padding: 0, border: sel ? "3px solid #5FA8A0" : "3px solid transparent",
                          borderRadius: 10, overflow: "hidden", cursor: "pointer", opacity: sel ? 1 : 0.75,
                          aspectRatio: "3 / 4",
                        }}>
                          {g.coverImage && <img src={proxyImg(g.coverImage)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#f0f1f5" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />}
                          {sel && <span style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "#5FA8A0", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                          <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", fontSize: 10, padding: "6px 4px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" onClick={() => setPickerOpen(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e2e6ee", background: "#fff", color: "#55627a", fontSize: 14, cursor: "pointer" }}>取消</button>
                <button type="button"
                  onClick={() => { setPickerOpen(false); generate() }}
                  disabled={allCovers.length >= MIN_SELECTABLE && selectedIds.size > 0 && selectedIds.size < MIN_SELECTABLE}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                    background: allCovers.length >= MIN_SELECTABLE && selectedIds.size > 0 && selectedIds.size < MIN_SELECTABLE ? "#c9d4d1" : "#5FA8A0",
                    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}>生成名片</button>
              </div>
            </div>
            {/* 右侧：实时预览（缩小显示名片，随选择即时更新） */}
            <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", background: "#f0f1f5", borderRadius: 12, padding: "16px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#55627a", marginBottom: 12 }}>实时预览</span>
              <div style={{ width: 230, height: 409, position: "relative", overflow: "hidden", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                <div style={{ transform: "scale(0.32)", transformOrigin: "top left", width: 720, height: 1280, pointerEvents: "none" }}>
                  {card}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#9aa3b5", marginTop: 10 }}>选择封面后此处即时更新</span>
            </div>
          </div>
        </div>
      )}

      {/* 名片渲染节点（仅客户端） */}
      {mounted && (
        <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
          {card}
        </div>
      )}
    </>
  )
}
