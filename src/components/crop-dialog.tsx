"use client"

import { Crop, Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useState } from "react"
import Cropper from "react-easy-crop"

interface CropDialogProps {
  cropSrc: string
  aspectRatio: number
  shape: "rounded" | "circle"
  onConfirm: (file: File) => void
  onCancel: () => void
}

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
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else canvas.toBlob((jpegBlob) => jpegBlob ? resolve(jpegBlob) : reject(new Error("图片处理失败")), "image/jpeg", 0.92)
      },
      "image/webp", 0.92
    )
  })
}

function rotateSize(width: number, height: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

export function CropDialog({ cropSrc, aspectRatio, shape, onConfirm, onCancel }: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  const onCropComplete = useCallback(
    (_: { x: number; y: number; width: number; height: number }, pixels: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(pixels)
    }, []
  )

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    setIsCropping(true)
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels, rotation)
      const ext = blob.type === "image/jpeg" ? "jpg" : "webp"
      onConfirm(new File([blob], `cropped.${ext}`, { type: blob.type }))
    } catch {
      setIsCropping(false)
    }
  }, [cropSrc, croppedAreaPixels, rotation, onConfirm])

  return (
    <div className="fixed inset-0 z-50 touch-none flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl p-5 shadow-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <h3 className="mb-4 text-sm font-semibold text-foreground">裁剪图片</h3>
        <div className="relative h-72 w-full overflow-hidden rounded-xl" style={{ background: "hsl(var(--muted))" }}>
          <Cropper image={cropSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={aspectRatio}
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            cropShape={shape === "circle" ? "round" : "rect"} />
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary" />
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <RotateCw className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input type="range" min={0} max={360} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary" />
            <span className="w-8 text-right text-[10px] text-muted-foreground">{rotation}°</span>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">取消</button>
          <button type="button" onClick={handleConfirm} disabled={isCropping} className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 bg-primary">
            {isCropping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
            {isCropping ? "处理中…" : "确认裁剪"}
          </button>
        </div>
      </div>
    </div>
  )
}
