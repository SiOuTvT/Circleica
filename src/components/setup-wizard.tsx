"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface FormData {
  siteName: string
  siteDescription: string
  siteLogo: string
  placeholderImage: string
  registrationEnabled: boolean
  username: string
  email: string
  password: string
  confirmPassword: string
}

const INITIAL: FormData = {
  siteName: "同人游戏站",
  siteDescription: "",
  siteLogo: "",
  placeholderImage: "",
  registrationEnabled: true,
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
}

const STEPS = ["网站信息", "管理员账号", "确认"]

export function SetupWizard() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [logoPreview, setLogoPreview] = useState("")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const update = (key: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError("")
  }

  // ── Logo 上传 ──
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/setup/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "上传失败")
      update("siteLogo", data.data.url)
      setLogoPreview(URL.createObjectURL(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败")
    } finally {
      setUploading(false)
    }
  }

  // ── 步骤验证 ──
  function validateStep(): boolean {
    setError("")
    if (step === 0) {
      if (!form.siteName.trim()) { setError("网站名称不能为空"); return false }
      return true
    }
    if (step === 1) {
      if (!form.username.trim()) { setError("用户名不能为空"); return false }
      if (!form.email.trim()) { setError("邮箱不能为空"); return false }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("邮箱格式不正确"); return false }
      if (form.password.length < 8) { setError("密码至少 8 个字符"); return false }
      if (form.password !== form.confirmPassword) { setError("两次密码不一致"); return false }
      return true
    }
    return true
  }

  function nextStep() {
    if (validateStep()) setStep(s => s + 1)
  }

  // ── 提交 ──
  async function handleSubmit() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: form.siteName.trim(),
          siteDescription: form.siteDescription.trim(),
          siteLogo: form.siteLogo,
          placeholderImage: form.placeholderImage.trim(),
          registrationEnabled: form.registrationEnabled,
          admin: {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "初始化失败")

      // 自动登录
      const signInResult = await signIn("credentials", {
        redirect: false,
        username: form.username.trim(),
        password: form.password,
      })

      if (signInResult?.ok) {
        router.refresh()
        router.push("/admin")
      } else {
        router.push("/login")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "初始化失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="p-6 space-y-6">
        {/* 标题 */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Fangame 初始化设置</h1>
          <p className="text-sm text-muted-foreground">首次部署，请完成以下配置</p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                ${i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        )}

        {/* Step 1: 网站信息 */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">网站名称 *</Label>
              <Input id="siteName" value={form.siteName} onChange={e => update("siteName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDesc">网站描述</Label>
              <Input id="siteDesc" value={form.siteDescription} onChange={e => update("siteDescription", e.target.value)}
                placeholder="面向 Galgame/视觉小说爱好者的社区平台" />
            </div>
            <div className="space-y-2">
              <Label>Logo（可选）</Label>
              <div className="flex items-center gap-3">
                {logoPreview || form.siteLogo ? (
                  <img src={logoPreview || form.siteLogo} alt="Logo 预览"
                    className="h-10 w-10 rounded object-contain bg-muted" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    Logo
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" disabled={uploading}
                  onClick={() => fileRef.current?.click()}>
                  {uploading ? "上传中..." : "选择图片"}
                </Button>
                {form.siteLogo && (
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => { update("siteLogo", ""); setLogoPreview(""); }}>
                    移除
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">建议尺寸 120x120，最大 2MB</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg">是否开放注册</Label>
              <select id="reg" value={form.registrationEnabled ? "1" : "0"}
                onChange={e => update("registrationEnabled", e.target.value === "1")}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="1">开放注册（允许新用户注册）</option>
                <option value="0">关闭注册（仅管理员可创建用户）</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: 管理员账号 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input id="username" value={form.username} onChange={e => update("username", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">密码 *</Label>
              <Input id="pw" type="password" value={form.password} onChange={e => update("password", e.target.value)}
                placeholder="至少 8 个字符" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">确认密码 *</Label>
              <Input id="pw2" type="password" value={form.confirmPassword}
                onChange={e => update("confirmPassword", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: 确认 */}
        {step === 2 && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">请确认以下配置信息：</p>
            <div className="space-y-2 rounded-md bg-muted/50 p-4">
              <SummaryRow label="网站名称" value={form.siteName} />
              {form.siteDescription && <SummaryRow label="网站描述" value={form.siteDescription} />}
              {form.siteLogo && <SummaryRow label="Logo" value="已上传" />}
              <SummaryRow label="开放注册" value={form.registrationEnabled ? "是" : "否"} />
              <div className="border-t border-border my-2" />
              <SummaryRow label="管理员" value={form.username} />
              <SummaryRow label="邮箱" value={form.email} />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              上一步
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" className="flex-1" onClick={nextStep}>
              下一步
            </Button>
          ) : (
            <Button type="button" className="flex-1" disabled={loading} onClick={handleSubmit}>
              {loading ? "正在初始化..." : "完成初始化"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
