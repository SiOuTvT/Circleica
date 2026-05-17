"use client"

interface ReportDialogProps {
  show: boolean
  onClose: () => void
  reason: string
  setReason: (v: string) => void
  reportSubmitting: boolean
  onSubmit: () => void
}

const REASONS = [
  { value: "illegal", label: "违法违规" },
  { value: "pornographic", label: "色情低俗" },
  { value: "spam", label: "垃圾广告" },
  { value: "abuse", label: "辱骂骚扰" },
  { value: "other", label: "其他" },
]

export function ReportDialog({ show, onClose, reason, setReason, reportSubmitting, onSubmit }: ReportDialogProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-card rounded-2xl p-6 w-[400px] max-w-[90vw] shadow-xl">
        <h3 className="text-lg font-bold text-foreground mb-4">举报游戏</h3>
        <div className="space-y-2 mb-4">
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
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={!reason || reportSubmitting}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 disabled:opacity-50 transition-opacity"
          >
            {reportSubmitting ? "提交中..." : "提交举报"}
          </button>
        </div>
      </div>
    </div>
  )
}