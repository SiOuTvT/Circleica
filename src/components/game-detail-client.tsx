"use client"

import { useState } from "react"

type Creator = {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  role: string
}

type Log = {
  id: string
  content: string
  createdAt: string
}

const roleMap: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  director: "导演",
  music: "音乐",
  songs: "主题曲",
}

export function GameDetailClient({
  description,
  screenshots,
  creators,
  logs,
}: {
  description: string
  screenshots: string[]
  creators: Creator[]
  logs: Log[]
}) {
  const [tab, setTab] = useState<"intro" | "screenshots" | "staff">("intro")

  return (
    <div className="mt-6">
      {/* Tab 导航 — 三按钮平分宽度, 选中 #80F3FF 下划线 */}
      <div className="flex border-b border-border">
        {(
          [
            { key: "intro", label: "剧情简介" },
            { key: "screenshots", label: "游戏截图" },
            { key: "staff", label: "制作人员" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? "#80F3FF" : "hsl(var(--muted-foreground))",
            }}
          >
            {t.label}
            {tab === t.key && (
              <span
                className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "#80F3FF" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="pt-6">
        {/* 剧情简介 — 纯文字, 禁止立绘 */}
        {tab === "intro" && (
          <div>
            {description ? (
              <div
                className="text-sm leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">暂无简介</p>
            )}
            {logs.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-semibold text-foreground">更新日志</h3>
                <ul className="space-y-3">
                  {logs.map((l) => (
                    <li key={l.id} className="flex gap-3">
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                      <span className="text-sm text-foreground">{l.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 游戏截图 — flex-direction: column, 一行一张 */}
        {tab === "screenshots" && (
          <div className="flex flex-col gap-4">
            {screenshots.length > 0 ? (
              screenshots.map((s, i) => (
                <div
                  key={i}
                  className="w-full overflow-hidden rounded-xl"
                  style={{ border: "1px solid hsl(var(--border))" }}
                >
                  <img
                    src={s}
                    alt={`截图 ${i + 1}`}
                    className="w-full object-cover"
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂无截图</p>
            )}
          </div>
        )}

        {/* 制作人员 */}
        {tab === "staff" && (
          <div>
            {creators.length > 0 ? (
              <div className="space-y-3">
                {creators.map((c) => (
                  <a
                    key={`${c.id}-${c.role}`}
                    href={`/creators/${c.id}`}
                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
                  >
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{
                          background: "linear-gradient(135deg, #80F3FF, #06b6d4)",
                        }}
                      >
                        {(c.nameJa || c.name)[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {c.nameJa || c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleMap[c.role] ?? c.role}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无制作人员信息</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}