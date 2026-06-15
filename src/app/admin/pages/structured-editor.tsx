"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, ArrowUp, ArrowDown, Type, List, Pilcrow, LayoutTemplate, ExternalLink } from "lucide-react"

interface Block {
  id: string
  type: "heading" | "paragraph" | "list" | "card" | "link-card" | "qa"
  content: string
  items?: string[]
}

interface StructuredEditorProps {
  html: string
  onChange: (html: string) => void
}

/**
 * 解析 HTML 字符串为可编辑的块
 */
function parseHTMLToBlocks(html: string): Block[] {
  if (!html) return []
  const blocks: Block[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  let listId = 0
  let cardId = 0

  const walk = (node: Element) => {
    const tagName = node.tagName.toLowerCase()

    // 1. 卡片 (rounded-xl bg-secondary/40)
    if (tagName === "div" && node.classList.contains("rounded-xl") && node.classList.contains("bg-secondary")) {
      const titleEl = node.querySelector("h3, h2, h1")
      const descEl = node.querySelector("p")

      // 检查是否是 Q&A 卡片
      const text = node.textContent || ""
      if (text.includes("Q:") && text.includes("A:")) {
        blocks.push({
          id: `qa-${cardId++}`,
          type: "qa",
          content: JSON.stringify({
            q: text.match(/Q:\s*(.+)/)?.[1]?.replace(/\s*A:.*/, "")?.trim() || "",
            a: text.match(/A:\s*(.+)/)?.[1]?.trim() || "",
          }),
        })
      } else {
        blocks.push({
          id: `card-${cardId++}`,
          type: "card",
          content: JSON.stringify({
            title: titleEl?.textContent?.trim() || "",
            desc: descEl?.textContent?.trim() || "",
          }),
        })
      }
      return
    }

    // 2. 链接卡片
    if (tagName === "a" && node.classList.contains("inline-flex") && node.classList.contains("rounded-xl")) {
      blocks.push({
        id: `link-${cardId++}`,
        type: "link-card",
        content: JSON.stringify({
          text: node.textContent?.trim() || "",
          href: node.getAttribute("href") || "",
        }),
      })
      return
    }

    // 3. 网格容器 - 递归处理里面的卡片
    if (tagName === "div" && node.classList.contains("grid")) {
      Array.from(node.children).forEach(walk)
      return
    }

    // 4. Section 容器 - 递归处理
    if (tagName === "section") {
      Array.from(node.children).forEach(walk)
      return
    }

    // 5. 标题
    if (tagName.startsWith("h") && !node.closest(".rounded-xl")) {
      blocks.push({
        id: `heading-${blocks.length}`,
        type: "heading",
        content: node.textContent?.trim() || "",
      })
      return
    }

    // 6. 段落 (不在卡片内)
    if (tagName === "p" && !node.closest(".rounded-xl")) {
      const text = node.textContent?.trim() || ""
      if (text) {
        blocks.push({
          id: `paragraph-${blocks.length}`,
          type: "paragraph",
          content: node.innerHTML || "",
        })
      }
      return
    }

    // 7. 列表
    if ((tagName === "ul" || tagName === "ol") && !node.closest(".rounded-xl")) {
      const items = Array.from(node.querySelectorAll("li")).map(li => li.textContent?.trim() || "")
      if (items.length > 0) {
        blocks.push({
          id: `list-${listId++}`,
          type: "list",
          content: tagName,
          items,
        })
      }
      return
    }

    // 递归处理子节点
    Array.from(node.children).forEach(walk)
  }

  walk(doc.body)
  return blocks
}

/**
 * 将块数组转换回 HTML
 */
function blocksToHTML(blocks: Block[]): string {
  const parts: string[] = []
  let cardGroup: Block[] = []

  const flushCardGroup = () => {
    if (cardGroup.length === 0) return

    if (cardGroup.length > 1) {
      parts.push(`<div class="grid gap-3 sm:grid-cols-2">`)
      for (const card of cardGroup) {
        parts.push(cardToHTML(card))
      }
      parts.push(`</div>`)
    } else if (cardGroup.length === 1) {
      parts.push(cardToHTML(cardGroup[0]))
    }
    cardGroup = []
  }

  for (const block of blocks) {
    if (block.type === "card" || block.type === "qa") {
      cardGroup.push(block)
    } else {
      flushCardGroup()
      parts.push(blockToHTML(block))
    }
  }
  flushCardGroup()

  return parts.join("\n\n")
}

function cardToHTML(block: Block): string {
  const data = JSON.parse(block.content)
  if (block.type === "qa") {
    return `<div class="rounded-xl bg-secondary/20 p-4">
<p class="text-sm font-medium text-foreground mb-1">Q: ${data.q || ""}</p>
<p class="text-xs text-muted-foreground">A: ${data.a || ""}</p>
</div>`
  }
  return `<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">${data.title || ""}</h3>
<p class="text-xs text-muted-foreground leading-relaxed">${data.desc || ""}</p>
</div>`
}

function blockToHTML(block: Block): string {
  switch (block.type) {
    case "heading":
      return `<h2 class="text-lg font-semibold text-foreground mb-3">${block.content}</h2>`
    case "paragraph":
      return `<p class="text-sm text-muted-foreground leading-relaxed">${block.content}</p>`
    case "list": {
      const tag = block.content === "ol" ? "ol" : "ul"
      const items = block.items?.map(item => `<li class="my-1.5">${item}</li>`).join("") || ""
      return `<${tag} class="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5 mb-4">${items}</${tag}>`
    }
    case "link-card": {
      const data = JSON.parse(block.content)
      return `<a href="${data.href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:bg-secondary/80">${data.text}</a>`
    }
    default:
      return ""
  }
}

/**
 * 单个块的编辑组件
 */
function BlockEditor({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: Block
  index: number
  total: number
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
  onMove: (dir: "up" | "down") => void
}) {
  const isCard = block.type === "card" || block.type === "qa"
  const data = isCard ? JSON.parse(block.content) : null

  return (
    <div className="group relative rounded-xl border border-border bg-card transition-all hover:shadow-sm">
      {/* 工具栏 */}
      <div className="absolute -top-3 right-2 flex items-center gap-1 bg-background border border-border rounded-lg px-1.5 py-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => onMove("up")}
          disabled={index === 0}
          className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          title="上移"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove("down")}
          disabled={index === total - 1}
          className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          title="下移"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500"
          title="删除"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 pt-6 space-y-3">
        {block.type === "heading" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
              <Type className="h-4 w-4" />
            </div>
            <Input
              value={block.content}
              onChange={e => onUpdate({ content: e.target.value })}
              placeholder="输入标题..."
              className="flex-1 h-9 font-semibold border-0 bg-transparent px-2 focus-visible:ring-0"
            />
          </div>
        )}

        {block.type === "paragraph" && (
          <div className="flex items-start gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-500/10 text-blue-500 flex-shrink-0 mt-0.5">
              <Pilcrow className="h-4 w-4" />
            </div>
            <Textarea
              value={block.content}
              onChange={e => onUpdate({ content: e.target.value })}
              placeholder="输入段落内容..."
              className="flex-1 border-0 bg-transparent px-2 focus-visible:ring-0 resize-none"
              rows={3}
            />
          </div>
        )}

        {block.type === "list" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-green-500/10 text-green-500">
                <List className="h-4 w-4" />
              </div>
              <select
                value={block.content}
                onChange={e => onUpdate({ content: e.target.value })}
                className="text-xs border border-border rounded-md px-2 py-1.5 bg-background"
              >
                <option value="ul">无序列表</option>
                <option value="ol">有序列表</option>
              </select>
            </div>
            <div className="space-y-1.5 pl-9">
              {block.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">
                    {block.content === "ol" ? `${i + 1}.` : "•"}
                  </span>
                  <Input
                    value={item}
                    onChange={e => {
                      const newItems = [...(block.items || [])]
                      newItems[i] = e.target.value
                      onUpdate({ items: newItems })
                    }}
                    className="flex-1 h-8 border-b border-border/50 focus-visible:border-foreground/20 rounded-none px-0 focus-visible:ring-0"
                  />
                  <button
                    onClick={() => {
                      const newItems = block.items?.filter((_, idx) => idx !== i)
                      if (newItems?.length) onUpdate({ items: newItems })
                    }}
                    className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 opacity-0 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(block.type === "card" || block.type === "qa") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-purple-500/10 text-purple-500">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground uppercase">{block.type === "qa" ? "Q&A 卡片" : "内容卡片"}</span>
            </div>
            {block.type === "qa" ? (
              <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                <Input
                  value={data.q}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...data, q: e.target.value }) })}
                  placeholder="问题..."
                  className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-medium"
                />
                <Textarea
                  value={data.a}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...data, a: e.target.value }) })}
                  placeholder="答案..."
                  className="border-0 bg-transparent px-0 focus-visible:ring-0 resize-none"
                  rows={2}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                <Input
                  value={data.title}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...data, title: e.target.value }) })}
                  placeholder="卡片标题..."
                  className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-semibold"
                />
                <Textarea
                  value={data.desc}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...data, desc: e.target.value }) })}
                  placeholder="卡片描述..."
                  className="border-0 bg-transparent px-0 focus-visible:ring-0 resize-none"
                  rows={2}
                />
              </div>
            )}
          </div>
        )}

        {block.type === "link-card" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-orange-500/10 text-orange-500">
                <ExternalLink className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground">链接按钮</span>
            </div>
            <div className="rounded-xl border border-border bg-secondary p-3 space-y-2">
              <Input
                value={data?.text || ""}
                onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), text: e.target.value }) })}
                placeholder="按钮文字..."
                className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0"
              />
              <Input
                value={data?.href || ""}
                onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), href: e.target.value }) })}
                placeholder="链接地址..."
                className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function StructuredEditor({ html, onChange }: StructuredEditorProps) {
  const blocks = parseHTMLToBlocks(html)

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = blocks.map((b, i) => (i === index ? { ...b, ...updates } : b))
    onChange(blocksToHTML(newBlocks))
  }

  const addBlock = (type: Block["type"]) => {
    const defaultContent: Record<string, string> = {
      heading: "",
      paragraph: "",
      list: "ul",
      card: JSON.stringify({ title: "", desc: "" }),
      "link-card": JSON.stringify({ text: "点击这里", href: "https://" }),
      qa: JSON.stringify({ q: "", a: "" }),
    }
    const newBlock: Block = {
      id: `${type}-${Date.now()}`,
      type,
      content: defaultContent[type],
      items: type === "list" ? [""] : undefined,
    }
    onChange(blocksToHTML([...blocks, newBlock]))
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <p className="text-sm">暂无内容，点击下方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={i}
              total={blocks.length}
              onUpdate={updates => updateBlock(i, updates)}
              onRemove={() => {
                const newBlocks = blocks.filter((_, idx) => idx !== i)
                onChange(blocksToHTML(newBlocks))
              }}
              onMove={dir => {
                const newIdx = dir === "up" ? i - 1 : i + 1
                if (newIdx < 0 || newIdx >= blocks.length) return
                const newBlocks = [...blocks]
                ;[newBlocks[i], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[i]]
                onChange(blocksToHTML(newBlocks))
              }}
            />
          ))}
        </div>
      )}

      {/* 添加按钮 */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
        <Button variant="ghost" size="sm" onClick={() => addBlock("heading")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-primary/10 hover:text-primary">
          <Type className="h-3.5 w-3.5 mr-1.5" /> 标题
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("paragraph")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-blue-500/10 hover:text-blue-500">
          <Pilcrow className="h-3.5 w-3.5 mr-1.5" /> 段落
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("list")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-green-500/10 hover:text-green-500">
          <List className="h-3.5 w-3.5 mr-1.5" /> 列表
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("card")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-purple-500/10 hover:text-purple-500">
          <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" /> 卡片
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("qa")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-amber-500/10 hover:text-amber-500">
          Q&A
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("link-card")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-orange-500/10 hover:text-orange-500">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> 链接
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        鼠标悬停在块上可移动/删除 · 连续卡片会自动组成网格
      </p>
    </div>
  )
}