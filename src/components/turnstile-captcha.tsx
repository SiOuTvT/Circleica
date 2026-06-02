"use client"

import { useCallback, useEffect, useRef, useState } from "react"

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
  const widgetIdRef = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // 稳定回调引用，避免 effect 重复执行
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  useEffect(() => { onVerifyRef.current = onVerify }, [onVerify])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  useEffect(() => {
    if (!siteKey) return
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = (window as any).turnstile
    if (!ts) return

    widgetIdRef.current = ts.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerifyRef.current(token),
      "error-callback": () => onErrorRef.current?.(),
    })

    return () => {
      if (widgetIdRef.current) {
        try { ts.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
    }
  }, [loaded, siteKey])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}
