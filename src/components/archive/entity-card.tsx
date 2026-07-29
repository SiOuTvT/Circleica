"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { roleLabel } from "@/lib/role-labels"

export interface StudioCardData {
  name: string
  normalized: string
  gameCount: number
  coverImage: string | null
  creatorCount: number
}

/** 组件契约（仅数据接口，供未来 Collection 页面复用）。M2 不实现其视觉变体，避免预埋半成品。 */
export interface CreatorCardData {
  id: string
  name: string
  nameJa?: string | null
  avatar?: string | null
  roles: string[]
}

export interface CollectionCardData {
  name: string
  slug: string
  gameCount: number
  coverImage?: string | null
}

function CardShell({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm",
        className,
      )}
    >
      {children}
    </Link>
  )
}

function CoverMedia({
  cover,
  initial,
}: {
  cover: string | null | undefined
  initial: string
}) {
  const [errored, setErrored] = useState(false)
  if (cover && !errored) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
          sizes="280px"
          onError={() => setErrored(true)}
        />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
      </div>
    )
  }
  return (
    <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <span className="text-2xl font-bold text-primary/30">{initial.slice(0, 1)}</span>
    </div>
  )
}

function StudioCard({ data }: { data: StudioCardData }) {
  return (
    <CardShell href={`/credits/studio/${encodeURIComponent(data.normalized)}`}>
      <CoverMedia cover={data.coverImage} initial={data.name} />
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="truncate font-heading text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {data.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums text-foreground/80">{data.gameCount}</span>
          <span>部作品</span>
          {data.creatorCount > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
              <span className="tabular-nums text-foreground/80">{data.creatorCount}</span>
              <span>位创作者</span>
            </>
          )}
        </div>
      </div>
    </CardShell>
  )
}

function CreatorAvatar({ avatar, initial }: { avatar: string | null | undefined; initial: string }) {
  const [errored, setErrored] = useState(false)
  if (avatar && !errored) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
        <Image
          src={avatar}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
          sizes="48px"
          onError={() => setErrored(true)}
        />
      </div>
    )
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-border/60">
      <span className="text-sm font-bold text-primary/40">{initial.slice(0, 1)}</span>
    </div>
  )
}

function CreatorCard({ data }: { data: CreatorCardData }) {
  const display = data.nameJa || data.name
  return (
    <CardShell href={`/creators/${data.id}`} className="flex-row">
      <div className="flex items-center gap-3 p-3.5">
        <CreatorAvatar avatar={data.avatar} initial={display} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {display}
          </h3>
          {data.roles.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.roles.slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="rounded bg-primary/10 px-1.5 py-0 text-[10px] leading-4 text-primary/80"
                >
                  {roleLabel(r)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </CardShell>
  )
}

/**
 * EntityCard — 卡片外壳（Framework，Archive 浏览体系共用）
 *
 * M2 实现 studio / creator 两个变体（落地列表页使用）。
 * collection 仅保留数据契约接口（CollectionCardData），其独立页面在后续阶段开发，此处不预埋半成品视觉。
 */
export function EntityCard(
  props: { variant: "studio"; data: StudioCardData } | { variant: "creator"; data: CreatorCardData },
) {
  if (props.variant === "creator") return <CreatorCard data={props.data} />
  return <StudioCard data={props.data} />
}
