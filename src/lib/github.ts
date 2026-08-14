/**
 * GitHub 数据获取（贡献者列表）。
 * 该模块此前缺失（api/contributors 路由原有断链 import），此处补齐最小可用实现。
 * 设计为「读取不到即优雅降级」：仓库未配置或 GitHub 不可达时返回空数组，不抛 5xx。
 */

import { fetchWithTimeout } from "@/lib/http"

interface GitHubContributor {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

export interface Contributor {
  login: string
  avatarUrl: string
  htmlUrl: string
  contributions: number
}

const GITHUB_API = "https://api.github.com"

/**
 * 获取仓库贡献者列表。
 * 通过环境变量 GITHUB_REPO（格式 "owner/repo"）指定目标仓库；未配置时返回空数组。
 */
export async function getContributors(): Promise<Contributor[]> {
  const repo = process.env.GITHUB_REPO
  if (!repo) return []

  try {
    const res = await fetchWithTimeout(`${GITHUB_API}/repos/${repo}/contributors?per_page=100`, {
      timeoutMs: 5000,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Circleica",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!res.ok) return []
    const data = (await res.json()) as GitHubContributor[]
    if (!Array.isArray(data)) return []
    return data.map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      htmlUrl: c.html_url,
      contributions: c.contributions,
    }))
  } catch {
    return []
  }
}
