"use client"

import { Download, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { formatZhDate } from "@/lib/date"
import { ROLE_META, type UserRole } from "@/lib/permissions"
import html2canvas from "html2canvas"

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
  /** 当前选用的头像框图片 URL（叠加在头像上展示） */
  avatarFrameUrl?: string
  /** 收藏的游戏（封面墙展示，最多 6） */
  favoriteGames?: Array<{ id: string; title: string; coverImage: string | null; serialId: number }>
  /** 关注的人（头像列表，最多 4） */
  followingUsers?: Array<{ id: string; username: string; avatar: string | null; composedAvatarUrl: string | null }>
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

/** 竖版卡片尺寸 */
const CARD_W = 720
const CARD_H = 1080

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [avatarError, setAvatarError] = useState(false)
  const [frameError, setFrameError] = useState(false)
  const [coverErrors, setCoverErrors] = useState<Record<string, boolean>>({})

  const joinDate = formatZhDate(data.createdAt)
  const roleMeta = ROLE_META[(data.role as UserRole)]
  const roleLabel = roleMeta?.label ?? ""
  const initials = data.username[0]?.toUpperCase() || "?"
  const bio = data.bio ? data.bio.slice(0, 80) : ""

  const avatarSrc = data.composedAvatarUrl || data.avatar || ""
  const frameSrc = data.avatarFrameUrl || ""
  const games = data.favoriteGames ?? []
  const following = data.followingUsers ?? []

  async function preloadImage(src: string): Promise<boolean> {
    if (!src) return false
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.referrerPolicy = "no-referrer"
      img.src = src
      await img.decode()
      return true
    } catch {
      return false
    }
  }

  async function generate() {
    if (generating) return
    setGenerating(true)
    try {
      // 等待核心图片加载完成（头像、头像框、封面墙）
      const [avatarOk, frameOk] = await Promise.all([preloadImage(avatarSrc), preloadImage(frameSrc)])
      setAvatarError(!avatarOk)
      setFrameError(!frameOk)

      const coverStates: Record<string, boolean> = {}
      await Promise.all(
        games.map(async (g) => {
          if (!g.coverImage) return
          const ok = await preloadImage(g.coverImage)
          coverStates[g.id] = !ok
        })
      )
      setCoverErrors(coverStates)

      await new Promise((r) => setTimeout(r, 80))

      const node = cardRef.current
      if (!node) throw new Error("card node missing")

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#f4f6fb",
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

  // 头像框叠加层
  const frameLayer = frameSrc && !frameError ? (
    <img
      src={frameSrc}
      alt=""
      onError={() => setFrameError(true)}
      style={{ position: "absolute", left: -14, top: -14, width: 188, height: 188, objectFit: "contain", pointerEvents: "none" }}
      crossOrigin="anonymous"
    />
  ) : null

  // 封面占位（封面加载失败时显示游戏首字）
  function coverPlaceholder(title: string) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #dfe9f3, #e6e9f5)", fontSize: 20, fontWeight: 700, color: "rgba(60,70,100,0.35)" }}>
        {title[0] ?? "?"}
      </div>
    )
  }

  // ═══ 竖版名片本体 ═══
  const card = (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif",
        borderRadius: 24,
        background: "#f4f6fb",
        color: "#1f2430",
      }}
    >
      {/* ═══ 顶部渐变区（浅色） ═══ */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 230, background: "linear-gradient(135deg, #5fa8a0 0%, #4a9ec2 45%, #8f6fd8 100%)" }}>
        {/* 装饰圆环 */}
        <div style={{ position: "absolute", right: 40, top: 36, width: 110, height: 110, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)" }} />
        <div style={{ position: "absolute", right: 52, top: 48, width: 86, height: 86, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)" }} />
        <div style={{ position: "absolute", right: 64, top: 60, width: 62, height: 62, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)" }} />
        {/* 光晕 */}
        <div style={{ position: "absolute", left: -60, top: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 60%)" }} />

        {/* 品牌字 */}
        <div style={{ position: "absolute", top: 28, left: 40, color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, letterSpacing: 4 }}>CIRCLEICA</div>
        <div style={{ position: "absolute", top: 30, right: 40, color: "rgba(255,255,255,0.65)", fontSize: 10, letterSpacing: 1 }}>GALVELICA</div>

        {/* 头像 + 名牌（重叠到渐变区底部） */}
        <div style={{ position: "absolute", left: 40, top: 76, width: 160, height: 160 }}>
          {/* 白色描边圆形底 */}
          <div style={{ position: "absolute", left: 6, top: 6, width: 148, height: 148, borderRadius: "50%", background: "#ffffff", boxShadow: "0 8px 24px rgba(40,60,90,0.18)" }}>
            <div style={{ position: "absolute", inset: 5, borderRadius: "50%", overflow: "hidden", background: "#e8edf5" }}>
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt=""
                  onError={() => setAvatarError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #5fa8a0, #8f6fd8)", fontSize: 52, fontWeight: 700, color: "#fff" }}>{initials}</div>
              )}
            </div>
          </div>
          {frameLayer}
        </div>

        {/* 名牌（头像右侧） */}
        <div style={{ position: "absolute", left: 230, top: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: "#ffffff", textShadow: "0 2px 8px rgba(20,40,60,0.25)", letterSpacing: 0.5 }}>{data.username}</span>
            {roleLabel && (
              <span style={{ padding: "3px 12px", borderRadius: 12, background: "rgba(255,255,255,0.22)", color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{roleLabel}</span>
            )}
          </div>
          <div style={{ marginTop: 10, color: "rgba(255,255,255,0.85)", fontSize: 13, letterSpacing: 1 }}>UID {data.uid}</div>
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 11 }}>加入于 {joinDate}</div>
        </div>
      </div>

      {/* ═══ 主体（白色卡片区） ═══ */}
      <div style={{ position: "absolute", top: 214, left: 24, right: 24, bottom: 0 }}>
        {/* 简介 */}
        {bio ? (
          <div style={{ padding: "14px 18px", borderRadius: 16, background: "#ffffff", boxShadow: "0 2px 10px rgba(40,60,90,0.05)", color: "#55627a", fontSize: 13, lineHeight: 1.7 }}>{bio}</div>
        ) : null}

        {/* 收藏游戏封面墙 */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#2a3142" }}>我的收藏</span>
            <span style={{ fontSize: 11, color: "#9aa3b5" }}>{data.favCount} 部</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #dde3ee, transparent)" }} />
          </div>
          {games.length > 0 ? (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {games.map((g) => (
                <div key={g.id} style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 3px 12px rgba(40,60,90,0.10)", aspectRatio: "3 / 4", background: "#eef1f7" }}>
                  {g.coverImage && !coverErrors[g.id] ? (
                    <img
                      src={g.coverImage}
                      alt={g.title}
                      onError={() => setCoverErrors((prev) => ({ ...prev, [g.id]: true }))}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      crossOrigin="anonymous"
                    />
                  ) : coverPlaceholder(g.title)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 12, padding: "20px 0", textAlign: "center", color: "#b3bac9", fontSize: 12, borderRadius: 14, background: "#f0f3f9" }}>
              还没有收藏游戏，去发现好作品吧
            </div>
          )}
        </div>

        {/* 关注的人 */}
        {following.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2a3142" }}>关注的人</span>
              <span style={{ fontSize: 11, color: "#9aa3b5" }}>{data.followingCount} 人</span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #dde3ee, transparent)" }} />
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 14 }}>
              {following.map((u) => (
                <div key={u.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "#e8edf5", border: "2px solid #ffffff", boxShadow: "0 2px 8px rgba(40,60,90,0.12)" }}>
                    {(u.composedAvatarUrl || u.avatar) ? (
                      <img src={u.composedAvatarUrl || u.avatar || ""} alt={u.username} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} crossOrigin="anonymous" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #7fb0a8, #9a86d8)", color: "#fff", fontSize: 18, fontWeight: 700 }}>{u.username[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#6b7488", maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部统计条（淡化） */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", background: "#ffffff", borderRadius: "18px 18px 0 0", boxShadow: "0 -2px 14px rgba(40,60,90,0.06)", padding: "16px 0", margin: "0 -24px" }}>
          {[
            { label: "收藏", value: data.favCount },
            { label: "关注", value: data.followingCount },
            { label: "粉丝", value: data.followerCount },
            { label: "评论", value: data.commentCount },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#3a4356" }}>{formatNum(s.value)}</div>
              <div style={{ marginTop: 3, fontSize: 11, color: "#9aa3b5", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部品牌小字 */}
      <div style={{ position: "absolute", bottom: 58, left: 0, right: 0, textAlign: "center", color: "#c0c7d4", fontSize: 10, letterSpacing: 6 }}>C I R C L E I C A</div>
    </div>
  )

  return (
    <>
      <button
        onClick={generate}
        type="button"
        disabled={generating}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary disabled:opacity-60"
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

      {/* 名片渲染节点（不可见，仅用于 html2canvas 截图） */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>{card}</div>
    </>
  )
}
