"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Contributor {
  login: string
  avatar_url: string
  contributions: number
}

export function ContributorsCard() {
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/contributors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContributors(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || contributors.length === 0) return null

  return (
    <section className="mt-8">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        撰稿人
      </h3>
      <div className="flex flex-wrap items-center gap-4">
        {contributors.map((c) => (
          <Link
            key={c.login}
            href={`https://github.com/${c.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 transition-all hover:border-primary/40 hover:shadow-1"
          >
            <Image
              src={c.avatar_url}
              alt={c.login}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full ring-1 ring-border"
              unoptimized
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                {c.login}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.contributions} 次提交
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
