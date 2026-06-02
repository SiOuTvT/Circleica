"use client"

import { cn } from "@/lib/utils";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Track { id: string; title: string; url: string }

export function MusicPlayer() {
  const audioRef              = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks]   = useState<Track[]>([])
  const [cur, setCur]         = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetch("/api/music").then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length) setTracks(data)
    }).catch(() => {})
  }, [])

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
        "border border-white/[0.08] light:border-black/[0.08]",
        "bg-zinc-900/95 light:bg-white/95",
        "shadow-2xl backdrop-blur-xl transition-all duration-300",
        expanded ? "w-64" : "w-12"
      )} style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* 进度条 */}
        {expanded && (
        <div className="h-3 w-full cursor-pointer bg-zinc-800 light:bg-zinc-200 flex items-center" onClick={handleSeek}>
            <div className="h-1 w-full bg-zinc-700 light:bg-zinc-300 rounded-full overflow-hidden">
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
                : "text-zinc-500 hover:text-zinc-300 light:text-zinc-500 light:hover:text-zinc-600"
            )}
          >
            <Music2 className={cn("h-4 w-4", playing && "animate-pulse")} strokeWidth={1.5} />
          </button>

          {expanded && (
            <>
              {/* 曲名 */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-zinc-300 light:text-zinc-700">{tracks[cur]?.title}</p>
                <p className="text-[10px] text-zinc-600 light:text-zinc-400">{cur + 1} / {tracks.length}</p>
              </div>

              {/* 控制按钮 */}
              <div className="flex items-center gap-0.5">
                <button onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 light:text-zinc-500 transition-colors hover:text-zinc-200 light:hover:text-zinc-700">
                  <SkipBack className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 light:text-zinc-700 transition-colors hover:text-white light:hover:text-zinc-900">
                  {playing ? <Pause className="h-4 w-4" strokeWidth={1.5} /> : <Play className="h-4 w-4" strokeWidth={1.5} />}
                </button>
                <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 light:text-zinc-500 transition-colors hover:text-zinc-200 light:hover:text-zinc-700">
                  <SkipForward className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => setMuted(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 light:text-zinc-500 transition-colors hover:text-zinc-200 light:hover:text-zinc-700">
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
