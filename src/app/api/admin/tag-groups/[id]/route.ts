import { NextResponse } from "next/server"
import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { tagGroupService } from "@/services/admin"
import { ValidationError } from "@/lib/errors"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await tagGroupService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  return json(await tagGroupService.update(id, body))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  // 二段式删除：组内还有标签时先回 409 + confirm，前端弹二次确认后再走 PATCH forceDelete。
  // confirm / tagCount / error 必须放在响应体顶层——apiClient 成功与失败都是按顶层取的。
  const [group, tagCount] = await Promise.all([tagGroupService.getById(id), tagGroupService.countTags(id)])
  // 预设组直接拒：否则会先给一个「强制删除」的二次确认，而强删同样会被服务层守卫拦下。
  if (group.isPreset) throw new ValidationError("预设标签组不可删除，可以在组内移除标签")
  if (tagCount > 0) {
    return NextResponse.json(
      {
        success: false,
        code: "CONFIRM_DELETE",
        error: `「${group.name}」下还有 ${tagCount} 个标签，删除后这些标签会变为未分组状态`,
        tagCount,
        confirm: true,
      },
      { status: 409 },
    )
  }
  await tagGroupService.delete(id)
  return noContent()
})

// Force-delete: unassigns tags from group before deleting
export const PATCH = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const { forceDelete } = await safeParseJson(req)
  if (!forceDelete) {
    throw new ValidationError("无效操作")
  }
  return json(await tagGroupService.forceDelete(id))
})
