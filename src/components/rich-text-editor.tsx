"use client"

import { cn } from "@/lib/utils"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
  Upload
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
}


export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "输入内容...",
  className,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  })

  const addImage = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
    [editor]
  )

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("请选择图片文件")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("图片大小不能超过 5MB")
        return
      }

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (res.ok && data.url) {
          addImage(data.url)
        } else {
          throw new Error(data.error || "上传失败")
        }
      } catch (error) {
        console.error("图片上传失败:", error)
        toast.error("图片上传失败")
      } finally {
        setUploading(false)
      }
    },
    [addImage]
  )

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      await uploadFile(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) await uploadFile(file)
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const addLink = useCallback(() => {
    if (!editor) return

    const url = window.prompt("输入链接地址:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/50">
        {/* 文本格式 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("bold")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="粗体"
        >
          <Bold className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("italic")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="斜体"
        >
          <Italic className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("underline")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="下划线"
        >
          <UnderlineIcon className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("strike")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="删除线"
        >
          <Strikethrough className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* 对齐方式 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive({ textAlign: "left" })
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="左对齐"
        >
          <AlignLeft className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive({ textAlign: "center" })
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="居中对齐"
        >
          <AlignCenter className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive({ textAlign: "right" })
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="右对齐"
        >
          <AlignRight className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* 列表 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("bulletList")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="无序列表"
        >
          <List className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("orderedList")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="有序列表"
        >
          <ListOrdered className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* 链接 */}
        <button
          type="button"
          onClick={addLink}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            editor.isActive("link")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
          title="添加链接"
        >
          <LinkIcon className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* 图片上传 */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            uploading && "opacity-50 cursor-not-allowed"
          )}
          title="插入图片"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ImageIcon className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* 编辑区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="relative"
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary/40">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" strokeWidth={1.5} />
              <span className="text-sm font-medium">松开上传图片</span>
            </div>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* 提示文字 */}
      <div className="px-4 py-2 text-xs text-zinc-600 light:text-zinc-400 border-t border-white/[0.06] light:border-black/[0.06] bg-zinc-900/50 light:bg-white/50">
        <span className="inline-flex items-center gap-1">
          <Upload className="h-3 w-3" strokeWidth={1.5} />
          拖拽图片到编辑区域上传
        </span>
        <span className="mx-2 text-zinc-700 light:text-zinc-300">•</span>
        点击工具栏图标格式化文本
      </div>
    </div>
  )
}
