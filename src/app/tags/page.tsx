import { permanentRedirect } from "next/navigation"

export default function TagsIndexRedirect() {
  permanentRedirect("/credits/tag")
}
