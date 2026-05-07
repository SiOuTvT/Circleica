"use client"

import { cn } from "@/lib/utils"
import { Upload, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

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

  useEffect(() => {
    if (value) setPreview(value)
  }, [value])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件")
        return
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`图片大小不能超过 ${maxSizeMB}MB`)
        return
      }

      // 显示本地预览
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        setPreview(url)
      }
      reader.readAsDataURL(file)

      // 上传或回调
      setIsUploading(true)
      try {
        if (uploadFunction) {
          const url = await uploadFunction(file)
          onChange?.(url)
        } else if (onFileSelect) {
          onFileSelect(file)
        } else {
          // 没有自定义上传函数时，直接用 data URL 作为值
          const dataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader()
            r.onload = (ev) => resolve(ev.target?.result as string)
            r.readAsDataURL(file)
          })
          onChange?.(dataUrl)
        }
      } catch (err) {
        console.error("上传失败:", err)
        alert("上传失败，请重试")
        setPreview(value || null)
      }
      setIsUploading(false)
    },
    [maxSizeMB, uploadFunction, onFileSelect, onChange, value]
  )

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

  // 有预览图时
  if (preview) {
    return (
      <div className={cn("group relative", className)}>
        <div
          className={cn(
            "relative overflow-hidden bg-zinc-800 ring-1 ring-white/[0.06]",
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
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800"
        )}
        style={{ aspectRatio, minHeight: "120px" }}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            isDragging ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"
          )}
        >
          <Upload className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p
            className={cn(
              "text-xs font-medium transition-colors",
              isDragging ? "text-blue-400" : "text-zinc-500"
            )}
          >
            {isDragging ? "释放以上传图片" : placeholder}
          </p>
          <p className="mt-1 text-[10px] text-zinc-700">
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