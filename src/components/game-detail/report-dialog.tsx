"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"

interface ReportDialogProps {
  show: boolean
  onClose: () => void
  reportSubmitting: boolean
  onSubmit: (reason: string) => void
}

const REASONS = [
  { value: "illegal", label: "违法违规" },
  { value: "pornographic", label: "色情低俗" },
  { value: "spam", label: "垃圾广告" },
  { value: "abuse", label: "辱骂骚扰" },
  { value: "other", label: "其他" },
]

export function ReportDialog({ show, onClose, reportSubmitting, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState("")
  const [otherText, setOtherText] = useState("")

  function handleSubmit() {
    const finalReason = reason === "other" && otherText.trim() ? `other: ${otherText.trim()}` : reason
    onSubmit(finalReason)
  }

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) { onClose(); setReason(""); setOtherText("") } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>举报游戏</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-input cursor-pointer hover:bg-accent transition-colors min-h-[44px]">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-red-500"
              />
              <span className="text-sm text-foreground">{r.label}</span>
            </label>
          ))}
          {reason === "other" && (
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="请描述举报原因…"
              rows={3}
              className="w-full rounded-xl bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 resize-none"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { onClose(); setReason(""); setOtherText("") }}>
            取消
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={!reason || reportSubmitting || (reason === "other" && !otherText.trim())}
          >
            {reportSubmitting ? "提交中…" : "提交举报"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
