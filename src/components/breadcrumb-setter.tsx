"use client"

import { useEffect } from "react";
import { useBreadcrumb, type CrumbItem } from "./breadcrumb-context";

/**
 * 在页面中使用此组件来设置当前动态段的面包屑标签。
 * 例如在游戏详情页中：<BreadcrumbSetter segment={gameId} label={game.title} />
 */
export function BreadcrumbSetter({ segment, label }: { segment: string; label: string }) {
  const { setDynamicLabel } = useBreadcrumb()

  useEffect(() => {
    setDynamicLabel(segment, label)
  }, [segment, label, setDynamicLabel])

  return null
}

/**
 * 设置当前页面的父级面包屑路径。
 * 用于逻辑上存在父子关系但URL不反映的页面。
 * 
 * 例如：
 * - 从"xxx的主页"跳转到"编辑资料"，面包屑应为：首页 › xxx的主页 › 编辑资料
 *   <BreadcrumbParentSetter crumbs={[{ label: "xxx的主页", href: "/user/123" }]} />
 * - 从游戏详情页跳转到某个子页面，面包屑应为：首页 › 游戏名 › 子页面
 *   <BreadcrumbParentSetter crumbs={[{ label: "游戏名", href: "/games/abc" }]} />
 */
export function BreadcrumbParentSetter({ crumbs }: { crumbs: CrumbItem[] }) {
  const { setParentCrumbs } = useBreadcrumb()

  useEffect(() => {
    setParentCrumbs(crumbs)
    return () => setParentCrumbs([])
  }, [crumbs, setParentCrumbs])

  return null
}
