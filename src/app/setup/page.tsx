import { isSiteInitialized } from "@/lib/site-settings"
import { redirect } from "next/navigation"

export default async function SetupPage() {
  // 已初始化：直接跳转首页，不再显示向导
  const initialized = await isSiteInitialized()
  if (initialized) {
    redirect("/")
  }
  // 未初始化：根布局已处理 SetupWizard 渲染，此处无需额外内容
  redirect("/")
}
