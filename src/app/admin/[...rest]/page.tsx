import { notFound } from "next/navigation"

/**
 * 后台 catch-all：/admin 下任何未匹配的地址（如 /admin/nope、/admin/xxx/yyy）都触发 notFound()，
 * 从而渲染 app/admin/not-found.tsx，保证 404 落在后台壳内（inShell=true），
 * 不再掉到前台根 404（inShell=false）。
 *
 * 静态 / 动态更具体的路由优先级高于 catch-all，故不会遮蔽已有后台页面。
 */
export default function AdminCatchAllPage() {
  notFound()
}
