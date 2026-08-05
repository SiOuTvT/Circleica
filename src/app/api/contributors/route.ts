import { NextResponse } from "next/server"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = "SiOuTvT"
const REPO_NAME = "Circleica"
const PER_PAGE = 100

interface GitHubCommitAuthor {
  login: string
  avatar_url: string
}

interface GitHubCommit {
  sha: string
  author: GitHubCommitAuthor | null
  commit: {
    author: { name: string; email: string; date: string } | null
  }
}

interface Contributor {
  login: string
  avatar_url: string
  contributions: number
}

let cache: { data: Contributor[]; timestamp: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 分钟

export async function GET() {
  // 有缓存直接返回
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=600" },
    })
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  }

  const contributors = new Map<string, Contributor>()
  let page = 1
  let hasMore = true

  // 分页拉取全部 commits，按 author.login 去重统计
  while (hasMore) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=${PER_PAGE}&page=${page}`
    const res = await fetch(url, { headers, next: { revalidate: 600 } })

    if (!res.ok) {
      const errBody = await res.text()
      console.error(`[contributors] GitHub API ${res.status}: ${errBody}`)
      if (res.status === 403 || res.status === 429) {
        // 限流：返回已有数据（如有），不返回错误
        if (contributors.size > 0) {
          const partial = Array.from(contributors.values())
          return NextResponse.json(partial, {
            headers: { "X-Cache": "PARTIAL", "X-Rate-Limited": "true" },
          })
        }
        return NextResponse.json({ error: "GitHub API 限流", detail: errBody }, { status: 502 })
      }
      break
    }

    const commits: GitHubCommit[] = await res.json()
    if (commits.length === 0) {
      hasMore = false
      break
    }

    for (const c of commits) {
      const author = c.author
      if (!author?.login) continue
      const existing = contributors.get(author.login)
      if (existing) {
        existing.contributions++
      } else {
        contributors.set(author.login, {
          login: author.login,
          avatar_url: author.avatar_url,
          contributions: 1,
        })
      }
    }

    // GitHub 返回 Link header 包含 rel="next" 时继续
    const linkHeader = res.headers.get("Link") ?? ""
    hasMore = linkHeader.includes('rel="next"')
    page++
  }

  const result = Array.from(contributors.values()).sort(
    (a, b) => b.contributions - a.contributions,
  )

  cache = { data: result, timestamp: Date.now() }

  return NextResponse.json(result, {
    headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=600" },
  })
}
