import { permanentRedirect } from "next/navigation"

export default function CreditsIndexRedirect() {
  permanentRedirect("/credits/studio")
}
