"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, SkipBack, SkipForward, Music2, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

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
        "fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-2xl backdrop-blur-xl transition-all duration-300",
        expanded ? "w-64" : "w-12"
      )}>
        {/* 进度条 */}
        {expanded && (
          <div className="h-0.5 w-full cursor-pointer bg-zinc-800" onClick={handleSeek}>
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="flex items-center gap-2 p-2">
          {/* 音乐图标按钮（收起时点击展开） */}
          <button
            onClick={() => setExpanded(v => !v)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
              playing ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Music2 className={cn("h-4 w-4", playing && "animate-pulse")} strokeWidth={1.5} />
          </button>

          {expanded && (
            <>
              {/* 曲名 */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-zinc-300">{tracks[cur]?.title}</p>
                <p className="text-[10px] text-zinc-600">{cur + 1} / {tracks.length}</p>
              </div>

              {/* 控制按钮 */}
              <div className="flex items-center gap-0.5">
                <button onClick={prev} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-200">
                  <SkipBack className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button onClick={togglePlay} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:text-white">
                  {playing ? <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </button>
                <button onClick={next} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-200">
                  <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button onClick={() => setMuted(v => !v)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-200">
                  {muted ? <VolumeX className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
