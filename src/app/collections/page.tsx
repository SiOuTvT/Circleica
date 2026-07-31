import { permanentRedirect } from "next/navigation"

/**
 * 旧 /collections 入口兼容跳转（M3 后精选合集统一在 /credits/collection）。
 * 永久迁移语义，保持 308。
 */
export default function CollectionsIndexRedirect() {
  permanentRedirect("/credits/collection")
}
