"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, ArrowUp, ArrowDown, Type, List, Pilcrow } from "lucide-react"

interface Block {
  id: string
  type: "heading" | "paragraph" | "list"
  content: string
  items?: string[]
}

interface StructuredEditorProps {
  html: string
  onChange: (html: string) => void
}

function parseHTMLToBlocks(html: string): Block[] {
  if (!html) return []
  const blocks: Block[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  let listId = 0

  Array.from(doc.body.children).forEach((child, index) => {
    const tagName = child.tagName.toLowerCase()
    if (tagName.startsWith("h")) {
      blocks.push({
        id: `heading-${index}`,
        type: "heading",
        content: child.textContent || "",
      })
    } else if (tagName === "p") {
      blocks.push({
        id: `paragraph-${index}`,
        type: "paragraph",
        content: child.innerHTML || "",
      })
    } else if (tagName === "ul" || tagName === "ol") {
      const items = Array.from(child.querySelectorAll("li")).map(li => li.textContent || "")
      blocks.push({
        id: `list-${listId++}`,
        type: "list",
        content: tagName,
        items,
      })
    }
  })

  return blocks
}

function blocksToHTML(blocks: Block[]): string {
  return blocks
    .map(block => {
      if (block.type === "heading") {
        return `<h2>${block.content}</h2>`
      }
      if (block.type === "paragraph") {
        return `<p>${block.content}</p>`
      }
      if (block.type === "list") {
        const tag = block.content === "ol" ? "ol" : "ul"
        const items = block.items?.map(item => `<li>${item}</li>`).join("") || ""
        return `<${tag}>${items}</${tag}>`
      }
      return ""
    })
    .join("")
}

export function StructuredEditor({ html, onChange }: StructuredEditorProps) {
  const blocks = parseHTMLToBlocks(html)

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = blocks.map((block, i) => (i === index ? { ...block, ...updates } : block))
    onChange(blocksToHTML(newBlocks))
  }

  const addBlock = (type: Block["type"]) => {
    const newBlock: Block = {
      id: `${type}-${Date.now()}`,
      type,
      content: type === "list" ? "ul" : "",
      items: type === "list" ? [""] : undefined,
    }
    onChange(blocksToHTML([...blocks, newBlock]))
  }

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index)
    onChange(blocksToHTML(newBlocks))
  }

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return
    const newBlocks = [...blocks]
    ;[newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]]
    onChange(blocksToHTML(newBlocks))
  }

  const addListItem = (blockIndex: number) => {
    const block = blocks[blockIndex]
    if (block.type !== "list") return
    const newItems = [...(block.items || []), ""]
    updateBlock(blockIndex, { items: newItems })
  }

  const updateListItem = (blockIndex: number, itemIndex: number, value: string) => {
    const block = blocks[blockIndex]
    if (block.type !== "list") return
    const newItems = block.items?.map((item, i) => (i === itemIndex ? value : item))
    updateBlock(blockIndex, { items: newItems })
  }

  const removeListItem = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex]
    if (block.type !== "list") return
    const newItems = block.items?.filter((_, i) => i !== itemIndex)
    updateBlock(blockIndex, { items: newItems })
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <p className="text-sm">暂无内容，点击下方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="group relative rounded-lg border border-border bg-card transition-all hover:shadow-sm"
            >
              {/* 工具栏 - hover 显示 */}
              <div className="absolute -top-3 right-2 flex items-center gap-1 bg-background border border-border rounded-md px-1.5 py-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => moveBlock(index, "up")}
                  disabled={index === 0}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  title="上移"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveBlock(index, "down")}
                  disabled={index === blocks.length - 1}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  title="下移"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-0.5" />
                <button
                  onClick={() => removeBlock(index)}
                  className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500"
                  title="删除"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 内容区域 */}
              <div className="p-4 pt-6">
                {block.type === "heading" && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary">
                      <Type className="h-3.5 w-3.5" />
                    </div>
                    <Input
                      value={block.content}
                      onChange={e => updateBlock(index, { content: e.target.value })}
                      placeholder="输入标题..."
                      className="h-9 text-sm font-semibold flex-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:bg-muted/50 rounded-none"
                    />
                  </div>
                )}

                {block.type === "paragraph" && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex-shrink-0 mt-0.5">
                      <Pilcrow className="h-3.5 w-3.5" />
                    </div>
                    <Textarea
                      value={block.content}
                      onChange={e => updateBlock(index, { content: e.target.value })}
                      placeholder="输入段落内容..."
                      className="min-h-[80px] text-sm flex-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:bg-muted/50 rounded-none resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {block.type === "list" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/10 text-green-500">
                        <List className="h-3.5 w-3.5" />
                      </div>
                      <select
                        value={block.content}
                        onChange={e => updateBlock(index, { content: e.target.value })}
                        className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-muted-foreground cursor-pointer hover:bg-accent/50"
                      >
                        <option value="ul">无序列表</option>
                        <option value="ol">有序列表</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addListItem(index)}
                        className="h-7 text-xs ml-auto"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1.5 pl-9">
                      {block.items?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2 group/item">
                          <span className="text-xs text-muted-foreground w-5 flex-shrink-0 text-right">
                            {block.content === "ol" ? `${itemIndex + 1}.` : "•"}
                          </span>
                          <Input
                            value={item}
                            onChange={e => updateListItem(index, itemIndex, e.target.value)}
                            placeholder={`列表项...`}
                            className="h-8 text-sm flex-1 border-0 bg-transparent border-b border-border/50 focus-visible:border-foreground/20 rounded-none px-0 focus-visible:ring-0"
                          />
                          <button
                            onClick={() => removeListItem(index, itemIndex)}
                            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部添加按钮 */}
      <div className="flex gap-2 pt-2 border-t border-border mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addBlock("heading")}
          className="flex-1 h-9 text-sm hover:bg-primary/10 hover:text-primary"
        >
          <Type className="h-4 w-4 mr-2" />
          标题
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addBlock("paragraph")}
          className="flex-1 h-9 text-sm hover:bg-blue-500/10 hover:text-blue-500"
        >
          <Pilcrow className="h-4 w-4 mr-2" />
          段落
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addBlock("list")}
          className="flex-1 h-9 text-sm hover:bg-green-500/10 hover:text-green-500"
        >
          <List className="h-4 w-4 mr-2" />
          列表
        </Button>
      </div>
    </div>
  )
}