import {
  Heart, HeartOff, CheckCircle, FileText, Bell, Gamepad2, PartyPopper, Sparkles,
  Search, Link as LinkIcon, Folder, Download, AlertTriangle, Clock,
  HelpCircle, Upload, Lightbulb, Flame, Eye, BookmarkPlus, BookmarkMinus,
  MessageCircle, MessageSquare, Pin, Save, ClipboardList, XCircle, Star, ThumbsUp,
  ThumbsDown, Music, Zap, Award, Sun, UserPlus, UserMinus, Compass,
  ServerCrash, WifiOff, Lock, Unlock, Key, Package, BookOpen, Inbox,
  Image, Mail, LogIn, Trophy, Map, User, Cloud,
} from "lucide-react"
import type { ComponentType, SVGProps } from "react"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

/**
 * 可用的 icon name 列表（供 admin 情感消息管理界面的图标下拉使用）
 */
export const EMOJI_OPTIONS = [
  "Heart", "HeartOff", "CheckCircle", "FileText", "Bell", "Gamepad2", "PartyPopper", "Sparkles",
  "Search", "Link", "Folder", "Download", "AlertTriangle", "Clock", "HelpCircle", "Upload",
  "Lightbulb", "Flame", "Eye", "BookmarkPlus", "BookmarkMinus", "MessageCircle", "MessageSquare", "Pin", "Save",
  "ClipboardList", "XCircle", "Star", "ThumbsUp", "ThumbsDown", "Music", "Zap", "Award", "Sun",
  "UserPlus", "UserMinus", "Compass", "ServerCrash", "WifiOff", "Lock", "Unlock", "Key", "Package",
  "BookOpen", "Inbox", "Image", "Mail", "LogIn", "Trophy", "Map", "User", "Cloud",
] as const

/**
 * 根据 icon name 获取 Lucide 图标组件。
 *
 * 注意：之前用 `const MAP = { Heart, CheckCircle, ... }` + `MAP[name]` 动态查表，
 * 在生产构建（Turbopack/webpack 的 usedExports + lucide-react 的 sideEffects:false）
 * 下，这些"仅被动态 key 读取"的属性会被 Tree-Shaking/DCE 整组删除，导致
 * getIconForEmoji 返回 null、线上空状态图标渲染成字符串（如 "CheckCircle"）。
 *
 * 这里改用 switch 静态返回每个组件：每个组件在可达代码路径里被静态引用，
 * 打包器无法将其判定为未使用，从而彻底避免生产环境图标丢失。
 */
export function getIconForEmoji(emoji: string): IconComponent | null {
  switch (emoji) {
    case "Heart": return Heart
    case "HeartOff": return HeartOff
    case "CheckCircle": return CheckCircle
    case "FileText": return FileText
    case "Bell": return Bell
    case "Gamepad2": return Gamepad2
    case "PartyPopper": return PartyPopper
    case "Sparkles": return Sparkles
    case "Search": return Search
    case "Link": return LinkIcon
    case "Folder": return Folder
    case "Download": return Download
    case "AlertTriangle": return AlertTriangle
    case "Clock": return Clock
    case "HelpCircle": return HelpCircle
    case "Upload": return Upload
    case "Lightbulb": return Lightbulb
    case "Flame": return Flame
    case "Eye": return Eye
    case "BookmarkPlus": return BookmarkPlus
    case "BookmarkMinus": return BookmarkMinus
    case "MessageCircle": return MessageCircle
    case "MessageSquare": return MessageSquare
    case "Pin": return Pin
    case "Save": return Save
    case "ClipboardList": return ClipboardList
    case "XCircle": return XCircle
    case "Star": return Star
    case "ThumbsUp": return ThumbsUp
    case "ThumbsDown": return ThumbsDown
    case "Music": return Music
    case "Zap": return Zap
    case "Award": return Award
    case "Sun": return Sun
    case "UserPlus": return UserPlus
    case "UserMinus": return UserMinus
    case "Compass": return Compass
    case "ServerCrash": return ServerCrash
    case "WifiOff": return WifiOff
    case "Lock": return Lock
    case "Unlock": return Unlock
    case "Key": return Key
    case "Package": return Package
    case "BookOpen": return BookOpen
    case "Inbox": return Inbox
    case "Image": return Image
    case "Mail": return Mail
    case "LogIn": return LogIn
    case "Trophy": return Trophy
    case "Map": return Map
    case "User": return User
    case "Cloud": return Cloud
    default: return null
  }
}
