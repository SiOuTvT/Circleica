-- Add slug column to Tag (Archive 实体，现已统一路由到 /credits/tag)
-- CJK-safe 稳定可读路由标识，与 name（@unique）职责分离。
-- Nullable + unique：回填脚本为每条存量 tag 分配稳定 slug。
-- NOTE: 与 Studio / Creator / CuratedCollection 的 slug 同属 Archive 统一 slug 路由规范，
-- 但作为独立迁移，不改动已应用的 20260731041500_add_archive_slugs。

ALTER TABLE "Tag" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
