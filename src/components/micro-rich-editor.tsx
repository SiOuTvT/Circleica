"use client"

import { cn } from "@/lib/utils"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Strikethrough, Underline as UnderlineIcon } from "lucide-react"
import { useCallback } from "react"

interface MicroRichEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
}

export function MicroRichEditor({
  content = "",
  onChange,
  placeholder = "输入内容...",
  className,
}: MicroRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        history: {},
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[80px] px-3 py-2 text-sm",
      },
    },
  })

  const addLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("输入链接地址", previousUrl || "")

    if (url === null) return // 用户取消
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* 简化工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-border bg-muted/50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("bold")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="粗体 (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("italic")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("underline")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="下划线 (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("strike")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="删除线"
        >
          <Strikethrough className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("bulletList")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="无序列表"
        >
          <List className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("orderedList")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="有序列表"
        >
          <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={addLink}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            editor.isActive("link")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="添加链接"
        >
          <LinkIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        {editor.isActive("link") && (
          <button
            type="button"
            onClick={removeLink}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              "text-red-500 hover:bg-red-500/10 hover:text-red-600"
            )}
            title="移除链接"
          >
            <LinkIcon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* 编辑区域 */}
      <EditorContent editor={editor} />
    </div>
  )
}