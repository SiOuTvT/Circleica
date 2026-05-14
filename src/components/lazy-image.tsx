"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  draggable?: boolean
}

export function LazyImage({ src, alt, className, style, draggable }: LazyImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)} style={style}>
      {/* 骨架占位 */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/50" />
      )}
      {inView && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          draggable={draggable}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  )
}