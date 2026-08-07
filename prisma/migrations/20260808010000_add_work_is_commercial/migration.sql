-- 副站商业作品标记列（同人资料馆不变式：只收同人 VN）
ALTER TABLE "Work" ADD COLUMN "isCommercial" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Work_isCommercial_idx" ON "Work" ("isCommercial");
