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
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

/** 头像框 PNG 统一按 1:1 等比叠加在头像上方 */
const AVATAR_SIZE = 132

export function CardGenerateBtn({ data }: CardData) {
  const [generating, setGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [frameReady, setFrameReady] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [frameError, setFrameError] = useState(false)

  const joinDate = formatZhDate(data.createdAt)
  const roleMeta = ROLE_META[(data.role as UserRole)]
  const roleLabel = roleMeta?.label ?? ""
  const initials = data.username[0]?.toUpperCase() || "?"
  const bio = data.bio ? data.bio.slice(0, 90) : ""

  const avatarSrc = data.composedAvatarUrl || data.avatar || ""
  const frameSrc = data.avatarFrameUrl || ""

  const stats = [
    { label: "收藏", value: data.favCount },
    { label: "关注者", value: data.followerCount },
    { label: "关注中", value: data.followingCount },
    { label: "评论", value: data.commentCount },
  ]

  async function preloadImage(src: string): Promise<HTMLImageElement | null> {
    if (!src) return null
    try {
      const img = new Image()
      // 同源无需 CORS；跨域图（R2 等）走匿名请求，需服务端允许
      img.crossOrigin = "anonymous"
      img.referrerPolicy = "no-referrer"
      img.src = src
      await img.decode()
      return img
    } catch {
      return null
    }
  }

  async function generate() {
    if (generating) return
    setGenerating(true)
    try {
      // 等待头像与头像框真正加载完成，避免 html2canvas 截到空白
      const [avatarImg, frameImg] = await Promise.all([preloadImage(avatarSrc), preloadImage(frameSrc)])
      setAvatarError(!avatarImg)
      setFrameError(!frameImg)
      // 让 React 应用兜底状态后再截图
      await new Promise((r) => setTimeout(r, 50))

      const node = cardRef.current
      if (!node) throw new Error("card node missing")

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#0b0c11",
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

  // ═══ 名片本体（隐藏渲染，用 html2canvas 截图） ═══
  const card = (
    <div
      ref={cardRef}
      style={{
        width: 1000,
        height: 560,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0b0c11 0%, #11131b 50%, #0d0e15 100%)",
        fontFamily: "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif",
        borderRadius: 22,
        color: "#fff",
      }}
    >
      {/* 双光晕 */}
      <div style={{ position: "absolute", left: -140, top: -120, width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(95,168,160,0.12) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", right: -120, bottom: -140, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 60%)" }} />

      {/* 顶部渐变带 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, rgba(95,168,160,0) 0%, rgba(95,168,160,0.65) 30%, rgba(168,85,247,0.65) 70%, rgba(168,85,247,0) 100%)" }} />

      {/* 装饰圆环（右上） */}
      <div style={{ position: "absolute", right: 40, top: 40, width: 112, height: 112, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />
      <div style={{ position: "absolute", right: 52, top: 52, width: 88, height: 88, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", right: 64, top: 64, width: 64, height: 64, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.03)" }} />

      {/* 装饰点阵（左下） */}
      {[[46, 500], [62, 500], [78, 500], [46, 516], [62, 516], [46, 532]].map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
      ))}

      {/* 外描边 */}
      <div style={{ position: "absolute", inset: 1, borderRadius: 21, border: "1px solid rgba(255,255,255,0.07)", pointerEvents: "none" }} />

      {/* ═══ 头部区：头像 + 名牌 ═══ */}
      <div style={{ position: "absolute", left: 52, top: 44, width: 148, height: 148 }}>
        {/* 头像框/头像 */}
        <div style={{ position: "absolute", left: 8, top: 8, width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "50%", background: "linear-gradient(135deg, rgba(95,168,160,0.55), rgba(168,85,247,0.55))", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
          <div style={{ position: "absolute", inset: 3, borderRadius: "50%", overflow: "hidden", background: "#15161c" }}>
            {avatarSrc && !avatarError ? (
              <img
                src={avatarSrc}
                alt=""
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                onError={() => setAvatarError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #3b5a72, #6d3b72)", fontSize: 44, fontWeight: 700 }}>{initials}</div>
            )}
          </div>
        </div>
        {/* 头像框叠加 */}
        {frameSrc && !frameError ? (
          <img
            src={frameSrc}
            alt=""
            width={AVATAR_SIZE + 24}
            height={AVATAR_SIZE + 24}
            onError={() => setFrameError(true)}
            style={{ position: "absolute", left: 0, top: 0, width: AVATAR_SIZE + 24, height: AVATAR_SIZE + 24, objectFit: "contain", pointerEvents: "none" }}
            crossOrigin="anonymous"
          />
        ) : (
          <div style={{ position: "absolute", left: 2, top: 2, width: AVATAR_SIZE + 20, height: AVATAR_SIZE + 20, borderRadius: "50%", border: "1.5px dashed rgba(95,168,160,0.30)", pointerEvents: "none" }} />
        )}
      </div>

      {/* 名牌区 */}
      <div style={{ position: "absolute", left: 226, top: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: "#fff", textShadow: "0 0 12px rgba(255,255,255,0.18)", letterSpacing: 1 }}>{data.username}</span>
          {roleLabel && (
            <span style={{ padding: "3px 12px", borderRadius: 12, background: "rgba(95,168,160,0.14)", border: "1px solid rgba(95,168,160,0.35)", color: "rgba(95,168,160,0.95)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{roleLabel}</span>
          )}
        </div>
        <div style={{ marginTop: 8, color: "rgba(255,255,255,0.35)", fontSize: 13, letterSpacing: 1 }}>UID {data.uid}</div>
      </div>

      {/* 简介 */}
      {bio && (
        <div style={{ position: "absolute", left: 52, top: 216, width: 880, color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bio}</div>
      )}

      {/* 分割线 */}
      <div style={{ position: "absolute", left: 52, right: 52, top: 252, height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* 品牌区 */}
      <div style={{ position: "absolute", left: 52, top: 272, display: "flex", justifyContent: "space-between", width: 896 }}>
        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 11, letterSpacing: 3 }}>CIRCLEICA · GALVELICA</span>
        <span style={{ color: "rgba(255,255,255,0.16)", fontSize: 11 }}>加入于 {joinDate}</span>
      </div>

      {/* ═══ 统计卡 ═══ */}
      <div style={{ position: "absolute", left: 52, top: 312, display: "flex", gap: 24, width: 896 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ position: "relative", flex: 1, height: 92, borderRadius: 14, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 3, height: "100%", background: "linear-gradient(180deg, rgba(95,168,160,0.9), rgba(168,85,247,0.9))" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{formatNum(s.value)}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.38)", letterSpacing: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部品牌带 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 46, background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, letterSpacing: 8 }}>CIRCLEICA</span>
      </div>
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
