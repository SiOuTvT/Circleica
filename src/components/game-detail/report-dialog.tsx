"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MessageSquare } from "lucide-react"
import { useState } from "react"

interface ReportDialogProps {
  show: boolean
  onClose: () => void
  reportSubmitting: boolean
  onSubmit: (reason: string) => void
}

const FEEDBACK_TYPES = [
  { value: "info_wrong", label: "资料信息有误" },
  { value: "image_wrong", label: "封面或截图有误" },
  { value: "tag_wrong", label: "分类或标签错误" },
  { value: "display_bug", label: "页面显示异常" },
  { value: "duplicate", label: "重复收录" },
  { value: "other", label: "其他" },
]

export function ReportDialog({ show, onClose, reportSubmitting, onSubmit }: ReportDialogProps) {
  const [selected, setSelected] = useState("")
  const [detail, setDetail] = useState("")

  function handleSubmit() {
    if (!selected) return
    const text = detail.trim()
    const reason = text ? `${selected}: ${text}` : selected
    onSubmit(reason)
  }

  function handleClose() {
    onClose()
    setSelected("")
    setDetail("")
  }

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            游戏反馈
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 反馈类型 — Chip 选择 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">选择反馈类型</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {FEEDBACK_TYPES.map((t) => {
                const isActive = selected === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelected(t.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
                      isActive
                        ? "bg-primary/15 text-primary ring-primary/30"
                        : "bg-transparent text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/20"
                    )}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 详细描述 — 始终显示 */}
          <div>
            <Textarea
              variant="filled"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="请详细描述具体问题，例如哪项资料有误、哪张图片有问题、哪个位置显示异常……"
              rows={3}
              className="resize-none text-sm py-2.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!selected || reportSubmitting}
            className="text-primary-foreground hover:opacity-90"
            style={{ background: "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.75)" }}
          >
            {reportSubmitting ? "提交中…" : "提交反馈"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
