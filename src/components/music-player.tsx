"use client"

import { cn } from "@/lib/utils";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Track { id: string; title: string; url: string }

export function MusicPlayer() {
  const { data: session } = useSession()
  const audioRef              = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks]   = useState<Track[]>([])
  const [cur, setCur]         = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [progress, setProgress] = useState(0)

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  useEffect(() => {
    if (!isSuperAdmin) return
    const controller = new AbortController()
    fetch("/api/music", { signal: controller.signal })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setTracks(data) })
      .catch(() => {})
    return () => controller.abort()
  }, [isSuperAdmin])

  // 切换曲目时加载
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !tracks[cur]) return
    const wasPlaying = playing
    audio.src = tracks[cur].url
    audio.load()
    if (wasPlaying) audio.play().catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, tracks])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio || !tracks.length) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  function prev() { setCur(c => (c - 1 + tracks.length) % tracks.length) }
  function next() { setCur(c => (c + 1) % tracks.length) }

  function handleEnded() { next() }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress(audio.currentTime / audio.duration * 100)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  if (!tracks.length) return null

  return (
    <>
      <audio
        ref={audioRef}
        muted={muted}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className={cn(
        "fixed right-5 z-50 flex flex-col overflow-hidden rounded-2xl",
        "ring-1 ring-border",
        "bg-card/95",
        "shadow-2xl backdrop-blur-xl transition-all duration-300",
        expanded ? "w-64" : "w-12"
      )} style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* 进度条 */}
        {expanded && (
        <div className="h-3 w-full cursor-pointer bg-secondary bg-muted flex items-center" onClick={handleSeek}>
            <div className="h-1 w-full bg-muted-foreground/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-2">
          {/* 音乐图标按钮（收起时点击展开） */}
          <button
            onClick={() => setExpanded(v => !v)}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              playing
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Music2 className={cn("h-4 w-4", playing && "animate-pulse")} strokeWidth={1.5} />
          </button>

          {expanded && (
            <>
              {/* 曲名 */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{tracks[cur]?.title}</p>
                <p className="text-[10px] text-muted-foreground">{cur + 1} / {tracks.length}</p>
              </div>

              {/* 控制按钮 */}
              <div className="flex items-center gap-0.5">
                <button onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
                  <SkipBack className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:text-foreground">
                  {playing ? <Pause className="h-4 w-4" strokeWidth={1.5} /> : <Play className="h-4 w-4" strokeWidth={1.5} />}
                </button>
                <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
                  <SkipForward className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => setMuted(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
                  {muted ? <VolumeX className="h-4 w-4" strokeWidth={1.5} /> : <Volume2 className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
