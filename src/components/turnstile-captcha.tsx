"use client"

import { useEffect, useRef, useState } from "react"

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void
  onError?: () => void
}

/**
 * Cloudflare Turnstile 验证码组件
 * 需要设置环境变量 NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * 如果未设置，组件不渲染（降级为无验证码模式）
 */
export function TurnstileCaptcha({ onVerify, onError }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    // 加载 Turnstile 脚本
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      script.onload = () => setLoaded(true)
      document.head.appendChild(script)
    } else {
      setLoaded(true)
    }
  }, [siteKey])

  useEffect(() => {
    if (!loaded || !siteKey || !containerRef.current) return

    // 渲染 Turnstile widget
    const win = window as Record<string, unknown>
    if (win.turnstile && containerRef.current) {
      win.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        "error-callback": () => onError?.(),
      })
    }
  }, [loaded, siteKey, onVerify, onError])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}
