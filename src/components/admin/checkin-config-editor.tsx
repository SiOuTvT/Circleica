"use client"

import { ImageIcon, Loader2, Upload, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CheckInConfig {
  title: string
  subtitle: string
  imageUrl: string
}

export function CheckInConfigEditor() {
  const [config, setConfig] = useState<CheckInConfig>({
    title: "",
    subtitle: "",
    imageUrl: "",
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>("")

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/checkin-config")
      const data = await res.json()
      const cfg = data.data ?? data
      setConfig(cfg)
      setPreview(cfg.imageUrl || "")
    } catch {
      toast.error("加载配置失败")
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/checkin-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast.success("配置已保存")
      } else {
        toast.error("保存失败")
      }
    } catch {
      toast.error("保存失败")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/checkin-config/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        setConfig({ ...config, imageUrl: data.url })
        setPreview(data.url)
        toast.success("图片上传成功")
      } else {
        toast.error(data.error || "上传失败")
      }
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setConfig({ ...config, imageUrl: "" })
    setPreview("")
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">签到卡片配置</h2>
      </div>

      {/* 文案配置 */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="checkin-title">标题</Label>
          <Input
            id="checkin-title"
            value={config.title ?? ""}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="签到成功"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="checkin-subtitle">副标题</Label>
          <Input
            id="checkin-subtitle"
            value={config.subtitle ?? ""}
            onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
            placeholder="获得 {marks} 印记"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            使用 {"{marks}"} 作为印记数量的占位符
          </p>
        </div>
      </div>

      {/* 图片配置 */}
      <div>
        <Label>卡片图片</Label>
        <div className="mt-2 flex items-start gap-4">
          {preview ? (
            <div className="relative h-24 w-24 rounded-lg overflow-hidden ring-1 ring-border bg-muted">
              <Image
                src={preview}
                alt="签到卡片图片"
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}

          <div className="flex-1">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? "上传中..." : "上传图片"}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              支持 JPG、PNG 格式，最大 5MB
              <br />
              建议使用固定尺寸的透明背景 PNG 图片
            </p>
          </div>
        </div>
      </div>

      {/* 预览区 */}
      {(config.title || config.subtitle || preview) && (
        <div>
          <Label>预览</Label>
          <div className="mt-2 inline-flex items-center gap-3 rounded-2xl bg-card px-6 py-4 ring-1 ring-border shadow-lg min-w-[280px]">
            {preview ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden ring-1 ring-border bg-muted shrink-0">
                <Image
                  src={preview}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg ring-1 ring-border bg-muted/50 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {config.title || "签到成功"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(config.subtitle || "获得 {marks} 印记").replace("{marks}", "3")}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-muted/50 shrink-0" />
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
          {loading ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" />保存中...</span> : "保存配置"}
        </Button>
      </div>
    </div>
  )
}