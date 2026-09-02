import type { Metadata } from "next"
import ResetPasswordPage from "./reset-password-page"

export const metadata: Metadata = {
  title: "重置密码",
}

export default function Page() {
  return <ResetPasswordPage />
}
