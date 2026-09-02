import type { Metadata } from "next"
import UnifiedMessagesPage from "./messages-page"

export const metadata: Metadata = {
  title: "私信与通知",
}

export default function Page() {
  return <UnifiedMessagesPage />
}
