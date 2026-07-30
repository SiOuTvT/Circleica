import { permanentRedirect } from "next/navigation"

/**
 * 旧 /creators 入口兼容跳转（M2 后创作者图鉴统一在 /credits/creator）。
 */
export default function CreatorsIndexRedirect() {
  permanentRedirect("/credits/creator")
}
