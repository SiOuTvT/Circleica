"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, ArrowUp, ArrowDown, Type, List, Pilcrow, LayoutTemplate, ExternalLink } from "lucide-react"

interface Block {
  id: string
  type: "heading" | "paragraph" | "list" | "card" | "small-card" | "link-card" | "qa"
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

  const processElement = (node: Element, parentIsGrid: boolean = false): boolean => {
    const tagName = node.tagName.toLowerCase()

    // 1. 卡片 (rounded-xl bg-secondary)
    if (tagName === "div" && node.classList.contains("rounded-xl") && node.className.includes("bg-secondary")) {
      const titleEl = node.querySelector("h3, h2, h1")
      const descEl = node.querySelector("p")
      const text = node.textContent || ""

      // 检查是否是 Q&A 卡片
      if (text.includes("Q:") && text.includes("A:")) {
        blocks.push({
          id: `qa-${cardId++}`,
          type: "qa",
          content: JSON.stringify({
            q: text.match(/Q:\s*(.+)/)?.[1]?.replace(/\s*A:.*/, "")?.trim() || "",
            a: text.match(/A:\s*(.+)/)?.[1]?.trim() || "",
            isGrid: parentIsGrid,
          }),
        })
        console.log("解析 Q&A 卡片:", blocks[blocks.length - 1])
      } else {
        const title = titleEl?.textContent?.trim() || ""
        const hasDesc = descEl && descEl.innerHTML.trim().length > 20 // 描述超过 20 字就算大卡片
        const isSmall = node.classList.contains("bg-secondary/20") || !hasDesc

        blocks.push({
          id: isSmall ? `small-card-${cardId++}` : `card-${cardId++}`,
          type: isSmall ? "small-card" : "card",
          content: JSON.stringify({
            title: title,
            desc: descEl?.innerHTML?.trim() || "",
            isGrid: parentIsGrid,
          }),
        })
        console.log("解析卡片:", { type: isSmall ? "small" : "card", title, isGrid: parentIsGrid })
      }
      return true
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
      return true
    }

    // 3. 标题 (不在卡片内)
    if (tagName.startsWith("h") && !node.closest(".rounded-xl")) {
      const text = node.textContent?.trim()
      if (text) {
        blocks.push({
          id: `heading-${blocks.length}`,
          type: "heading",
          content: text,
        })
      }
      return true
    }

    // 4. 段落 (不在卡片内)
    if (tagName === "p" && !node.closest(".rounded-xl")) {
      const text = node.textContent?.trim()
      if (text) {
        blocks.push({
          id: `paragraph-${blocks.length}`,
          type: "paragraph",
          content: node.innerHTML,
        })
      }
      return true
    }

    // 5. 列表 (不在卡片内)
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
      return true
    }

    // 6. 容器元素 - 递归处理子元素
    if (tagName === "div" || tagName === "section") {
      const isGrid = node.classList.contains("grid") || node.classList.contains("grid-cols")
      const isStack = node.classList.contains("space-y")
      Array.from(node.children).forEach(child => processElement(child, isGrid && !isStack))
      return true
    }

    return false
  }

  // 处理 body 的直接子元素
  Array.from(doc.body.children).forEach(child => processElement(child, false))

  console.log("解析结果 blocks:", blocks)

  // 如果 body 没有直接子元素，尝试解析单个元素
  if (doc.body.children.length === 0 && doc.body.textContent?.trim()) {
    const firstChild = doc.body.firstChild
    if (firstChild) {
      processElement(firstChild as Element, false)
    }
  }

  return blocks
}

/**
 * 将块数组转换回 HTML
 */
function blocksToHTML(blocks: Block[]): string {
  const parts: string[] = []
  let cardGroup: { block: Block; layout: "grid" | "stack" }[] = []

  const flushCardGroup = () => {
    if (cardGroup.length === 0) return

    const firstCardLayout = cardGroup[0].layout

    if (firstCardLayout === "grid") {
      // 网格布局（单个或多个都包 grid）
      parts.push(`<div class="grid gap-3 sm:grid-cols-2">`)
      for (const { block } of cardGroup) {
        parts.push(cardToHTML(block))
      }
      parts.push(`</div>`)
    } else {
      // 竖直布局（space-y）
      parts.push(`<div class="space-y-3">`)
      for (const { block } of cardGroup) {
        parts.push(cardToHTML(block))
      }
      parts.push(`</div>`)
    }
    cardGroup = []
  }

  for (const block of blocks) {
    if (block.type === "card" || block.type === "small-card" || block.type === "qa") {
      const data = JSON.parse(block.content)
      const layout: "grid" | "stack" = data.isGrid ? "grid" : "stack"
      cardGroup.push({ block, layout })
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

  if (block.type === "small-card") {
    return `<div class="rounded-xl bg-secondary/40 p-4">
<h3 class="text-sm font-semibold text-foreground mb-1">${data.title || ""}</h3>
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
  onToggleSmallCardLayout,
}: {
  block: Block
  index: number
  total: number
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
  onMove: (dir: "up" | "down") => void
  onToggleSmallCardLayout?: (index: number) => void
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

        {(block.type === "card" || block.type === "small-card" || block.type === "qa") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-purple-500/10 text-purple-500">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground uppercase">
                {block.type === "qa" ? "Q&A 卡片" : block.type === "small-card" ? "小卡片" : "内容卡片"}
              </span>
            </div>
            {block.type === "qa" ? (
              <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                <Input
                  value={data?.q || ""}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), q: e.target.value }) })}
                  placeholder="问题..."
                  className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-medium"
                />
                <Textarea
                  value={data?.a || ""}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), a: e.target.value }) })}
                  placeholder="答案..."
                  className="border-0 bg-transparent px-0 focus-visible:ring-0 resize-none"
                  rows={2}
                />
              </div>
            ) : block.type === "small-card" ? (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Input
                    value={data?.title || ""}
                    onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), title: e.target.value }) })}
                    placeholder="小卡片标题..."
                    className="flex-1 h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-semibold"
                  />
                  <button
                    onClick={() => onToggleSmallCardLayout?.(index)}
                    className="ml-2 text-xs text-primary hover:text-primary/80 whitespace-nowrap"
                  >
                    {data?.isGrid ? "切换为竖向" : "切换为网格"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.isGrid ? "网格布局：一行两个（半行一个）" : "竖向布局：一行一个"}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                <Input
                  value={data?.title || ""}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), title: e.target.value }) })}
                  placeholder="卡片标题..."
                  className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-semibold"
                />
                <Textarea
                  value={data?.desc || ""}
                  onChange={e => onUpdate({ content: JSON.stringify({ ...(data || {}), desc: e.target.value }) })}
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
      card: JSON.stringify({ title: "", desc: "", isGrid: true }),
      "small-card": JSON.stringify({ title: "", isGrid: true }),
      "link-card": JSON.stringify({ text: "点击这里", href: "https://" }),
      qa: JSON.stringify({ q: "", a: "", isGrid: true }),
    }
    const newBlock: Block = {
      id: `${type}-${Date.now()}`,
      type,
      content: defaultContent[type],
      items: type === "list" ? [""] : undefined,
    }
    onChange(blocksToHTML([...blocks, newBlock]))
  }

  // 检测连续的同类型卡片组（都是 grid 或都是 stack）
  // 注意：小卡片 (small-card) 现在也支持网格布局（一行两个）
  const getCardGroup = (index: number): { start: number; end: number; isGrid: boolean } | null => {
    const block = blocks[index]
    if (block.type !== "card" && block.type !== "small-card" && block.type !== "qa") return null

    const blockData = JSON.parse(block.content)
    const blockIsGrid = !!blockData.isGrid

    let start = index
    let end = index

    while (start > 0) {
      const prev = blocks[start - 1]
      if (prev.type !== "card" && prev.type !== "small-card" && prev.type !== "qa") break
      const prevData = JSON.parse(prev.content)
      if (!!prevData.isGrid !== blockIsGrid) break
      start--
    }

    while (end < blocks.length - 1) {
      const next = blocks[end + 1]
      if (next.type !== "card" && next.type !== "small-card" && next.type !== "qa") break
      const nextData = JSON.parse(next.content)
      if (!!nextData.isGrid !== blockIsGrid) break
      end++
    }

    return { start, end, isGrid: blockIsGrid }
  }

  // 切换卡片布局（grid <-> stack）
  const toggleLayout = (index: number) => {
    const block = blocks[index]
    if (block.type !== "card" && block.type !== "small-card" && block.type !== "qa") return
    const data = JSON.parse(block.content)
    const newBlocks = blocks.map((b, i) => {
      if (i === index) {
        return { ...b, content: JSON.stringify({ ...data, isGrid: !data.isGrid }) }
      }
      return b
    })
    onChange(blocksToHTML(newBlocks))
  }

  // 单独切换小卡片布局
  const toggleSmallCardLayout = (index: number) => {
    const block = blocks[index]
    if (block.type !== "small-card") return
    const data = JSON.parse(block.content)
    const newBlocks = blocks.map((b, i) => {
      if (i === index) {
        return { ...b, content: JSON.stringify({ ...data, isGrid: !data.isGrid }) }
      }
      return b
    })
    onChange(blocksToHTML(newBlocks))
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <p className="text-sm">暂无内容，点击下方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, i) => {
            const isCard = block.type === "card" || block.type === "small-card" || block.type === "qa"
            const group = isCard ? getCardGroup(i) : null
            const isInMultiCardGroup = group && (group.end - group.start + 1) > 1
            const isStartOfGroup = group && i === group.start
            const isGrid = group?.isGrid
            // 单个小卡片也需要检查自身的 isGrid
            const blockData = block.type === "small-card" ? JSON.parse(block.content) : null
            const isSmallCardGrid = blockData?.isGrid

            // 如果是多卡片组的第一项，渲染容器
            if (isInMultiCardGroup && isStartOfGroup) {
              const groupBlocks = blocks.slice(group.start, group.end + 1)
              return (
                <div key={`group-${group.start}`} className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {isGrid ? "网格布局（一行两个）" : "竖直布局（一行一个）"}
                    </span>
                    <button
                      onClick={() => {
                        // 切换整个组的布局
                        const newBlocks = blocks.map((b, idx) => {
                          if (idx >= group.start && idx <= group.end) {
                            const data = JSON.parse(b.content)
                            return { ...b, content: JSON.stringify({ ...data, isGrid: !isGrid }) }
                          }
                          return b
                        })
                        onChange(blocksToHTML(newBlocks))
                      }}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      切换为{isGrid ? "竖直" : "网格"}
                    </button>
                  </div>
                  <div className={isGrid ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                    {groupBlocks.map((b, idxInGroup) => (
                      <BlockEditor
                        key={b.id}
                        block={b}
                        index={group.start + idxInGroup}
                        total={blocks.length}
                        onUpdate={updates => updateBlock(group.start + idxInGroup, updates)}
                        onRemove={() => {
                          const newBlocks = blocks.filter((_, idx) => idx !== group.start + idxInGroup)
                          onChange(blocksToHTML(newBlocks))
                        }}
                        onMove={dir => {
                          const currentIdx = group.start + idxInGroup
                          const newIdx = dir === "up" ? currentIdx - 1 : currentIdx + 1
                          if (newIdx < 0 || newIdx >= blocks.length) return
                          const newBlocks = [...blocks]
                          ;[newBlocks[currentIdx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[currentIdx]]
                          onChange(blocksToHTML(newBlocks))
                        }}
                        onToggleSmallCardLayout={toggleSmallCardLayout}
                      />
                    ))}
                  </div>
                </div>
              )
            }
            // 如果是多卡片组的非第一项，跳过（已在上一个迭代中渲染）
            else if (isInMultiCardGroup && !isStartOfGroup) {
              return null
            }
            // 单个卡片或非卡片块
            else {
              // 单个卡片如果是网格布局，显示为半行一个
              const singleCardData = isCard ? JSON.parse(block.content) : null
              if (isCard && singleCardData?.isGrid) {
                return (
                  <div key={block.id} className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-3">
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground">网格布局（一行两个）</span>
                      <button
                        onClick={() => {
                          const newBlocks = blocks.map((b, idx) => {
                            if (idx === i) {
                              const data = JSON.parse(b.content)
                              return { ...b, content: JSON.stringify({ ...data, isGrid: false }) }
                            }
                            return b
                          })
                          onChange(blocksToHTML(newBlocks))
                        }}
                        className="ml-2 text-xs text-primary hover:text-primary/80"
                      >
                        切换为竖向
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        onToggleSmallCardLayout={toggleSmallCardLayout}
                      />
                    </div>
                  </div>
                )
              }
              return (
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
                  onToggleSmallCardLayout={toggleSmallCardLayout}
                />
              )
            }
          })}
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
          <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" /> 大卡片
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("small-card")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-pink-500/10 hover:text-pink-500">
          <LayoutTemplate className="h-3 w-3 mr-1.5" /> 小卡片
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("qa")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-amber-500/10 hover:text-amber-500">
          Q&A
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addBlock("link-card")} className="flex-1 min-w-[80px] h-9 text-xs hover:bg-orange-500/10 hover:text-orange-500">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> 链接
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        大卡片有标题和描述 · 小卡片只有标题更紧凑 · 虚线框内为卡片组
      </p>
    </div>
  )
}