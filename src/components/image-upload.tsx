"use client"

import { cn } from "@/lib/utils"
import { Crop, RotateCw, Upload, X, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import Cropper from "react-easy-crop"
import { toast } from "sonner"

/** 从 canvas 裁剪区域生成 Blob */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  const radians = (rotation * Math.PI) / 180
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation)

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(radians)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(data, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.92)
  })
}

function rotateSize(width: number, height: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

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

  // 裁剪相关状态
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number; y: number; width: number; height: number
  } | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  useEffect(() => {
    if (value) setPreview(value)
  }, [value])

  const onCropComplete = useCallback(
    (_croppedArea: { x: number; y: number; width: number; height: number }, croppedPixels: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(croppedPixels)
    },
    []
  )

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

      // 如果是头像裁剪模式（onFileSelect），直接回调
      if (onFileSelect) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const url = e.target?.result as string
          setCropSrc(url)
          setCrop({ x: 0, y: 0 })
          setZoom(1)
          setRotation(0)
        }
        reader.readAsDataURL(file)
        return
      }

      // 否则进入裁剪流程
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        setCropSrc(url)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setRotation(0)
      }
      reader.readAsDataURL(file)
    },
    [maxSizeMB, onFileSelect]
  )

  const handleCropConfirm = useCallback(async () => {
    if (!cropSrc || !croppedAreaPixels) return
    setIsCropping(true)
    try {
      const croppedBlob = await getCroppedImg(cropSrc, croppedAreaPixels, rotation)
      const croppedFile = new File([croppedBlob], "cropped.webp", { type: "image/webp" })

      // 如果是头像裁剪模式
      if (onFileSelect) {
        onFileSelect(croppedFile)
        setPreview(URL.createObjectURL(croppedBlob))
        setCropSrc(null)
        setIsCropping(false)
        return
      }

      // 显示本地预览
      setPreview(URL.createObjectURL(croppedBlob))

      // 上传
      setIsUploading(true)
      setCropSrc(null)
      try {
        if (uploadFunction) {
          const url = await uploadFunction(croppedFile)
          onChange?.(url)
        } else {
          // 使用自建上传 API
          const formData = new FormData()
          formData.append("file", croppedFile)
          const res = await fetch("/api/upload", { method: "POST", body: formData })
          const data = await res.json()
          if (res.ok && data.url) {
            onChange?.(data.url)
          } else {
            throw new Error(data.error || "上传失败：未返回 URL")
          }
        }
      } catch (err) {
        console.error("上传失败:", err)
        toast.error("上传失败，请重试")
        setPreview(value || null)
      }
      setIsUploading(false)
    } catch (err) {
      console.error("裁剪失败:", err)
      toast.error("裁剪失败，请重试")
    }
    setIsCropping(false)
    setCropSrc(null)
  }, [cropSrc, croppedAreaPixels, rotation, onFileSelect, uploadFunction, onChange, value])

  const handleCropCancel = useCallback(() => {
    setCropSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }, [])

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
  if (cropSrc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative mx-4 w-full max-w-lg rounded-2xl p-5 shadow-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">裁剪图片</h3>

          {/* 裁剪区域 */}
          <div className="relative h-72 w-full overflow-hidden rounded-xl" style={{ background: "hsl(var(--muted))" }}>
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape={shape === "circle" ? "round" : "rect"}
            />
          </div>

          {/* 控制条 */}
          <div className="mt-4 space-y-3">
            {/* 缩放 */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ accentColor: "var(--clr-blue)" }}
              />
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            {/* 旋转 */}
            <div className="flex items-center gap-3">
              <RotateCw className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ accentColor: "var(--clr-blue)" }}
              />
              <span className="w-8 text-right text-[10px] text-muted-foreground">{rotation}°</span>
            </div>
          </div>

          {/* 按钮 */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCropCancel}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCropConfirm}
              disabled={isCropping}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--clr-blue)" }}
            >
              {isCropping ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Crop className="h-4 w-4" />
              )}
              {isCropping ? "处理中…" : "确认裁剪"}
            </button>
          </div>
        </div>
      </div>
    )
  }

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