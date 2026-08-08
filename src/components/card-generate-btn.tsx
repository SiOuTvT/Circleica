"use client"

import { Download, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { ROLE_META, type UserRole } from "@/lib/permissions"
import html2canvas from "html2canvas"

interface FavoriteGame {
  id: string
  title: string
  coverImage: string | null
  serialId: number
  isNsfw: boolean
}

interface FavoriteTag {
  name: string
  color: string
  count: number
}

interface CardData {
  username: string
  uid: string
  avatar: string | null
  composedAvatarUrl: string | null
  banner: string | null
  bio: string
  role: string
  createdAt: string
  favCount: number
  commentCount: number
  followerCount: number
  followingCount: number
  avatarFrameUrl?: string
  favoriteGames?: FavoriteGame[]
  followingUsers?: Array<{ id: string; username: string; avatar: string | null; composedAvatarUrl: string | null }>
  favoriteTags?: FavoriteTag[]
}

/** 竖版卡片尺寸（9:16） */
const CARD_W = 720
const CARD_H = 1280

/** 封面选择范围 */
const MAX_SELECTABLE = 8
const MIN_SELECTABLE = 3

/* ── Canvas 预渲染工具（绕开 html2canvas 不支持 CSS filter / SVG filter 的限制） ── */

/**
 * 预渲染 Banner：blur(26px) + saturate(0.55) + brightness(1.22) → 输出普通图片 dataURL。
 * 用 Canvas 2D 的 ctx.filter 原生实现，结果交给 html2canvas 时只是普通 <img>。
 */
async function preprocessBanner(src: string, targetW = 360, targetH = 640): Promise<string> {
  try {
    const img = await loadImage(src)
    const canvas = document.createElement("canvas")
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext("2d")
    if (!ctx) return ""
    ctx.filter = "blur(26px) saturate(0.55) brightness(1.22)"
    // 铺满裁剪（cover 语义）
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.drawImage(img, (targetW - w) / 2, (targetH - h) / 2, w, h)
    return canvas.toDataURL("image/png")
  } catch {
    return ""
  }
}

/** 预生成 64×64 噪点纹理 PNG（baseFrequency 模拟，opacity 极低） */
let noiseTextureCache: string | null = null
function getNoiseTexture(): string {
  if (noiseTextureCache) return noiseTextureCache
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  const imgData = ctx.createImageData(size, size)
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 40
    imgData.data[i] = v
    imgData.data[i + 1] = v
    imgData.data[i + 2] = v
    imgData.data[i + 3] = 26 // 极低透明度
  }
  ctx.putImageData(imgData, 0, 0)
  noiseTextureCache = canvas.toDataURL("image/png")
  return noiseTextureCache
}

/** 通用图片加载 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.referrerPolicy = "no-referrer"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("load failed"))
    img.src = src
  })
}

/* ── 工具 ── */

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "")
  return [parseInt(c.substring(0, 2), 16) || 76, parseInt(c.substring(2, 4), 16) || 126, parseInt(c.substring(4, 6), 16) || 150]
}

/** 把主题色调浅并混入米白，得到极浅背景色（用于无 Banner 时的底色） */
function tintToPaper(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (v: number) => Math.round(v + (248 - v) * 0.88)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

/** 主题色 → 极浅光晕（radial-gradient 背景值） */
function glowGradient(hex: string, alpha = 0.05): string {
  const [r, g, b] = hexToRgb(hex)
  return `radial-gradient(circle at 20% 15%, rgba(${r},${g},${b},${alpha}) 0%, transparent 55%)`
}

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [avatarError, setAvatarError] = useState(false)
  const [frameError, setFrameError] = useState(false)
  const [coverErrorIds, setCoverErrorIds] = useState<Set<string>>(new Set())
  const [bannerBgData, setBannerBgData] = useState<string>("")
  const cardRef = useRef<HTMLDivElement>(null)

  function coverFailed(id: string) { return coverErrorIds.has(id) }
  function markCoverFailed(id: string) {
    setCoverErrorIds((prev) => new Set(prev).add(id))
  }

  const roleMeta = ROLE_META[(data.role as UserRole)]
  const roleLabel = roleMeta?.label ?? ""
  const initials = data.username[0]?.toUpperCase() || "?"
  const avatarSrc = data.composedAvatarUrl || data.avatar || ""
  const frameSrc = data.avatarFrameUrl || ""

  // 读取站点真实主题色（layout 已注入 --primary；SSR 期间拿不到则回退薄荷绿）
  const [themeHex, setThemeHex] = useState("#5FA8A0")
  useEffect(() => {
    if (typeof window !== "undefined") {
      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
      if (primary) setThemeHex(primary)
    }
  }, [])

  // NSFW 排除后的可选封面池
  const safeGames = (data.favoriteGames ?? []).filter((g) => !g.isNsfw)
  const allCovers = safeGames.filter((g) => g.coverImage)

  // 打开选择器时：默认选最近 8 张（含无封面的？不——只选有封面的，且限最多 8）
  function openPicker() {
    const defaults = new Set(allCovers.slice(0, MAX_SELECTABLE).map((g) => g.id))
    setSelectedIds(defaults)
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

  /** 计算自适应布局的封面几何（上层溢出 + 下层立排） */
  function computeCoverLayout(n: number) {
    // 上层溢出数量：0/1/2 全在上层；≥3 上层取 3
    const upperN = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3
    const lowerN = Math.max(0, n - upperN)
    return { upperN, lowerN }
  }

  // 上层封面几何
  function upperGeometry(i: number, upperN: number): { x: number; y: number; w: number; rotate: number; z: number } {
    if (upperN === 1) return { x: 140, y: 70, w: 440, rotate: 0, z: 2 }
    if (upperN === 2) {
      return i === 0
        ? { x: 150, y: 90, w: 440, rotate: 1.2, z: 2 }   // 大封面
        : { x: 30, y: 60, w: 230, rotate: -12, z: 1 }    // 副封面左后
    }
    // upperN === 3
    if (i === 0) return { x: 160, y: 90, w: 420, rotate: 1.5, z: 3 }   // 主封面
    if (i === 1) return { x: 30, y: 55, w: 215, rotate: -13, z: 2 }     // 副封面左后
    return { x: 470, y: 80, w: 190, rotate: 10, z: 2 }                  // 副封面右后
  }

  async function generate() {
    if (generating) return
    // 如果用户没打开选择器就直接点生成 → 自动取默认（最近 8）
    const covers = chosenN > 0 ? chosenCovers : allCovers.slice(0, MAX_SELECTABLE)
    if (covers.length === 0 && allCovers.length === 0) {
      // N=0 极简名片也可以生成，不阻塞
    }
    setGenerating(true)
    try {
      // 预加载头像、头像框
      let avatarOk = false
      let frameOk = false
      try { await loadImage(avatarSrc); avatarOk = !!avatarSrc } catch { avatarOk = false }
      try { await loadImage(frameSrc); frameOk = !!frameSrc } catch { frameOk = false }
      setAvatarError(!avatarOk)
      setFrameError(!frameOk)

      // 预加载封面（确保截图时封面已渲染）
      await Promise.all(covers.map(async (g) => {
        if (!g.coverImage) return
        try { await loadImage(g.coverImage) } catch { markCoverFailed(g.id) }
      }))

      // 预渲染 Banner 背景（blur 处理）
      const bannerBg = data.banner ? await preprocessBanner(data.banner) : ""
      setBannerBgData(bannerBg)

      // 预生成噪点纹理（模块级缓存，生成一次即可）
      getNoiseTexture()

      // 等待 React 应用错误兜底状态
      await new Promise((r) => setTimeout(r, 80))

      const node = cardRef.current
      if (!node) throw new Error("card node missing")

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#F8F7F3",
        useCORS: true,
        allowTaint: false,
        logging: false,
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
    } finally {
      setGenerating(false)
    }
  }

  const n = chosenN > 0 ? chosenN : allCovers.length
  const { upperN, lowerN } = computeCoverLayout(Math.min(n, MAX_SELECTABLE))
  const renderCovers = chosenN > 0 ? chosenCovers : allCovers.slice(0, MAX_SELECTABLE)

  /* ═══ 名片本体（浅色「溢出的书橱」） ═══ */
  const card = (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif",
        borderRadius: 28,
        background: data.banner ? "transparent" : tintToPaper(themeHex),
        color: "#232830",
        boxSizing: "border-box",
        boxShadow: "inset 0 0 0 1px rgba(40,50,70,0.08)",
      }}
    >
      {/* 背景层 */}
      {data.banner && bannerBgData ? (
        <img src={bannerBgData} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(160deg, ${tintToPaper(themeHex)} 0%, #F8F7F3 45%, ${tintToPaper(themeHex)} 100%)`,
        }} />
      )}

      {/* 光晕层 */}
      <div style={{ position: "absolute", inset: 0, background: glowGradient(themeHex, 0.05), pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 85% 80%, rgba(168,85,247,0.04) 0%, transparent 55%)", pointerEvents: "none" }} />

      {/* 噪点纹理层 */}
      {getNoiseTexture() && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${getNoiseTexture()})`, opacity: 0.5, pointerEvents: "none" }} />
      )}

      {/* 顶部高光 + 底部微暗（卡面厚度） */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.9)", pointerEvents: "none" }} />

      {/* 顶部品牌字 */}
      <div style={{ position: "absolute", top: 22, left: 0, right: 0, textAlign: "center", color: "rgba(40,50,70,0.32)", fontSize: 10, fontWeight: 600, letterSpacing: 6 }}>CIRCLEICA</div>

      {/* ═══ 上层溢出封面区（44-520px） ═══ */}
      <div style={{ position: "absolute", top: 44, left: 0, right: 0, height: 476 }}>
        {renderCovers.slice(0, upperN).map((g, i) => {
          const geo = upperGeometry(i, upperN)
          const ok = !coverFailed(g.id)
          return (
            <div key={g.id} style={{ position: "absolute", left: geo.x, top: geo.y, width: geo.w, zIndex: geo.z }}>
              <div style={{
                padding: 3,
                background: "#ffffff",
                borderRadius: 8,
                boxShadow: "0 4px 10px rgba(35,45,65,0.12), 0 16px 32px rgba(35,45,65,0.09)",
                border: "1px solid rgba(40,50,70,0.10)",
                transform: `rotate(${geo.rotate}deg)`,
                transformOrigin: "center bottom",
              }}>
                <div style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: 4, overflow: "hidden", background: "#f0f1f5", position: "relative" }}>
                  {g.coverImage && ok ? (
                    <img src={g.coverImage} alt="" onError={() => markCoverFailed(g.id)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(95,168,160,0.10), rgba(168,85,247,0.10))", fontSize: 24, fontWeight: 700, color: "rgba(60,70,100,0.35)" }}>{g.title[0] ?? "?"}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ 台面线（L4） ═══ */}
      <div style={{ position: "absolute", top: 520, left: 44, right: 44, height: 1, background: "linear-gradient(90deg, transparent, rgba(40,50,70,0.12) 30%, rgba(40,50,70,0.12) 70%, transparent)" }} />
      <div style={{ position: "absolute", top: 524, left: 60, right: 60, height: 2, background: "rgba(35,45,65,0.05)", filter: "blur(1px)", pointerEvents: "none" }} />

      {/* ═══ 身份区（560-800px） ═══ */}
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
        {/* 头像 + 框 */}
        <div style={{ position: "relative", width: 196, height: 196 }}>
          <div style={{ position: "absolute", left: 34, top: 34, width: 128, height: 128, borderRadius: "50%", background: "#ffffff", border: "1px solid rgba(40,50,70,0.08)", boxShadow: "0 3px 8px rgba(35,45,65,0.12)", overflow: "hidden" }}>
            {avatarSrc && !avatarError ? (
              <img src={avatarSrc} alt="" onError={() => setAvatarError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #5FA8A0, #8f6fd8)", fontSize: 52, fontWeight: 700, color: "#ffffff" }}>{initials}</div>
            )}
          </div>
          {frameSrc && !frameError ? (
            <img src={frameSrc} alt="" onError={() => setFrameError(true)} style={{ position: "absolute", left: 0, top: 0, width: 196, height: 196, objectFit: "contain", boxShadow: "0 5px 12px rgba(35,45,65,0.16)", borderRadius: "50%", pointerEvents: "none" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
          ) : null}
        </div>
        {/* 用户名 + 角色徽章 */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: "#232830", letterSpacing: 0.5 }}>{data.username}</span>
          {roleLabel && (
            <span style={{ padding: "3px 12px", borderRadius: 12, background: "rgba(95,168,160,0.12)", border: "1px solid rgba(95,168,160,0.28)", color: "rgba(60,120,110,0.9)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{roleLabel}</span>
          )}
        </div>
        <div style={{ marginTop: 6, color: "rgba(40,50,70,0.38)", fontSize: 10, letterSpacing: 1 }}>UID {data.uid}</div>
      </div>

      {/* ═══ 下层立排封面区（830-1150px） ═══ */}
      {lowerN > 0 && (
        <div style={{ position: "absolute", top: 830, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 16, padding: "0 44px", zIndex: 4 }}>
          {renderCovers.slice(upperN, upperN + lowerN).map((g, i) => {
            const ok = !coverFailed(g.id)
            const w = Math.min(112, (632 - (lowerN - 1) * 16) / lowerN)
            return (
              <div key={g.id} style={{ width: w }}>
                <div style={{
                  padding: 3,
                  background: "#ffffff",
                  borderRadius: 8,
                  boxShadow: "0 2px 5px rgba(35,45,65,0.10), 0 8px 16px rgba(35,45,65,0.07)",
                  border: "1px solid rgba(40,50,70,0.10)",
                  transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (0.8 + Math.min(i, 3) * 0.3)}deg)`,
                  transformOrigin: "center bottom",
                }}>
                  <div style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: 4, overflow: "hidden", background: "#f0f1f5", position: "relative" }}>
                    {g.coverImage && ok ? (
                      <img src={g.coverImage} alt="" onError={() => markCoverFailed(g.id)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(95,168,160,0.10), rgba(168,85,247,0.10))", fontSize: 18, fontWeight: 700, color: "rgba(60,70,100,0.35)" }}>{g.title[0] ?? "?"}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ 标签行 + 签名（1150-1230px） ═══ */}
      <div style={{ position: "absolute", top: 1150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
        {(data.favoriteTags ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", padding: "0 44px" }}>
            {(data.favoriteTags ?? []).slice(0, 5).map((t) => (
              <span key={t.name} style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: t.color,
                background: `${t.color}18`,
                border: `1px solid ${t.color}30`,
              }}>{t.name}</span>
            ))}
          </div>
        )}
        {data.bio && (
          <div style={{ marginTop: 10, maxWidth: 560, padding: "0 44px", color: "rgba(40,50,70,0.58)", fontSize: 14, lineHeight: 1.6, textAlign: "center", whiteSpace: "pre-wrap" }}>{data.bio.slice(0, 40)}</div>
        )}
      </div>

      {/* ═══ 底部品牌带（1230-1280px） ═══ */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(40,50,70,0.32)", fontSize: 10, fontWeight: 600, letterSpacing: 8 }}>GALVELICA</span>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => { openPicker() }}
        type="button"
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
      >
        {generating ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2} />
        ) : (
          <Download className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
        )}
        <span className="text-xs font-medium text-foreground">
          {generating ? "生成中…" : "生成名片"}
        </span>
      </button>

      {/* 封面选择弹窗 */}
      {pickerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#232830", margin: 0 }}>选择代表收藏</h3>
            <p style={{ fontSize: 12, color: "#9aa3b5", marginTop: 4 }}>选择 3-8 张游戏封面作为名片展示（最多 8 张，来自你的收藏）</p>

            {allCovers.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#b3bac9", fontSize: 13 }}>
                你的收藏中还没有可展示的封面（NSFW 已自动排除）。
                <br />先收藏几个有封面的游戏再来吧。
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
                {allCovers.map((g) => {
                  const sel = selectedIds.has(g.id)
                  return (
                    <button key={g.id} type="button" onClick={() => toggleSelect(g.id)} style={{
                      position: "relative", padding: 0, border: sel ? "3px solid #5FA8A0" : "3px solid transparent",
                      borderRadius: 10, overflow: "hidden", cursor: "pointer", opacity: sel ? 1 : 0.75, aspectRatio: "3 / 4",
                    }}>
                      {g.coverImage ? (
                        <img src={g.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#f0f1f5" }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
                      ) : null}
                      {sel && (
                        <span style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "#5FA8A0", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
                      )}
                      <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", fontSize: 10, padding: "6px 4px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setPickerOpen(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e2e6ee", background: "#fff", color: "#55627a", fontSize: 14, cursor: "pointer" }}>取消</button>
              <button type="button" onClick={() => { setPickerOpen(false); generate() }} disabled={selectedIds.size > 0 && selectedIds.size < MIN_SELECTABLE} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                background: selectedIds.size >= MIN_SELECTABLE || selectedIds.size === 0 ? "#5FA8A0" : "#c9d4d1",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>生成名片</button>
            </div>
          </div>
        </div>
      )}

      {/* 名片渲染节点（不可见） */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
        <div>{card}</div>
      </div>
    </>
  )
}
