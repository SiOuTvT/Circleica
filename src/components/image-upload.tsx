"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { cn } from "@/lib/utils"
import { Upload, X } from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const CropDialog = dynamic(() => import("./crop-dialog").then(m => ({ default: m.CropDialog })), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>,
  ssr: false,
})

interface ImageUploadProps {
  value?: string
  onChange?: (url: string) => void
  onFileSelect?: (file: File) => void
  aspectRatio?: number
  maxSizeMB?: number
  className?: string
  placeholder?: string
  shape?: "rounded" | "circle"
  uploadFunction?: (file: File) => Promise<string>
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  aspectRatio = 1,
  maxSizeMB = 5,
  className,
  placeholder = "拖拽图片到此处或点击上传",
  shape = "rounded",
  uploadFunction,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 记录自身 onChange 发出的 URL，防止 useEffect 用服务器 URL 覆盖 blob 预览
  const lastEmittedUrlRef = useRef<string | null>(null)

  // 裁剪相关状态
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => {
    if (value === lastEmittedUrlRef.current) {
      lastEmittedUrlRef.current = null
      return
    }
    if (value) setPreview(value)
  }, [value])

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("请选择图片文件")
        return
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`图片大小不能超过 ${maxSizeMB}MB`)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => { setCropSrc(e.target?.result as string) }
      reader.readAsDataURL(file)
    },
    [maxSizeMB]
  )

  // 裁剪确认回调（由 CropDialog 调用，已裁剪完成的 File）
  const handleCropConfirm = useCallback(async (croppedFile: File) => {
    setCropSrc(null)
    if (onFileSelect) {
      onFileSelect(croppedFile)
      setPreview(URL.createObjectURL(croppedFile))
      return
    }
    setPreview(URL.createObjectURL(croppedFile))
    setIsUploading(true)
    try {
      if (uploadFunction) {
        const url = await uploadFunction(croppedFile)
        lastEmittedUrlRef.current = url
        onChange?.(url)
      } else {
        const formData = new FormData()
        formData.append("file", croppedFile)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (res.ok && data.url) {
          lastEmittedUrlRef.current = data.url
          onChange?.(data.url)
        } else {
          throw new Error(data.error || "上传失败：未返回 URL")
        }
      }
    } catch (err) {
      console.error("上传失败:", err)
      toast.error(err instanceof Error ? err.message : "上传失败，请重试")
      setPreview(value || null)
    }
    setIsUploading(false)
  }, [onFileSelect, uploadFunction, onChange, value])

  const handleCropCancel = useCallback(() => { setCropSrc(null) }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    setPreview(null)
    onChange?.("")
  }, [onChange])

  // 裁剪弹窗
  useBodyScrollLock(!!cropSrc)
  if (cropSrc) {
    return (
      <CropDialog
        cropSrc={cropSrc}
        aspectRatio={aspectRatio}
        shape={shape}
        onConfirm={(file) => {
          if (onFileSelect) {
            onFileSelect(file)
            setPreview(URL.createObjectURL(file))
            setCropSrc(null)
          } else {
            handleCropConfirm(file)
          }
        }}
        onCancel={handleCropCancel}
      />
    )
  }

  // 有预览图时
  if (preview) {
    return (
      <div className={cn("group relative", className)}>
        <div
          className={cn(
            "relative overflow-hidden bg-zinc-800 light:bg-zinc-100 ring-1 ring-white/[0.06] light:ring-black/[0.06]",
            shape === "circle" ? "rounded-full" : "rounded-xl"
          )}
          style={{ aspectRatio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="预览" className="h-full w-full object-cover" />
          {/* 悬浮遮罩 */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-red-500/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    )
  }

  // 空状态 - 拖拽上传区域
  return (
    <div className={cn("relative", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed transition-all",
          shape === "circle" ? "rounded-full" : "rounded-xl",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-zinc-700 light:border-zinc-300 bg-zinc-900 light:bg-white hover:border-zinc-600 light:hover:border-zinc-400 hover:bg-zinc-800 light:hover:bg-zinc-100"
        )}
        style={{ aspectRatio, minHeight: "120px" }}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            isDragging ? "bg-primary/20 text-primary" : "bg-zinc-800 light:bg-zinc-100 text-zinc-500"
          )}
        >
          <Upload className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p
            className={cn(
              "text-xs font-medium transition-colors",
              isDragging ? "text-primary" : "text-zinc-500"
            )}
          >
            {isDragging ? "释放以上传图片" : placeholder}
          </p>
          <p className="mt-1 text-[10px] text-zinc-700 light:text-zinc-300">
            支持 JPG、PNG、WebP，最大 {maxSizeMB}MB
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}