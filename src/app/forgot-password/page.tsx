import type { Metadata } from "next"
import ForgotPasswordPage from "./forgot-password-page"

export const metadata: Metadata = {
  title: "找回密码",
}

export default function Page() {
  return <ForgotPasswordPage />
}
