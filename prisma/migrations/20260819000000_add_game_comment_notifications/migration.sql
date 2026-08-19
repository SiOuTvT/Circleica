-- 新增游戏评论/评论点赞通知类型
-- 前台：游戏页新评论 → 通知游戏发布者；游戏评论被赞 → 通知评论作者
ALTER TYPE "NotificationTypeEnum" ADD VALUE 'game_comment_new';
ALTER TYPE "NotificationTypeEnum" ADD VALUE 'game_comment_like';
ALTER TYPE "NotificationTargetTypeEnum" ADD VALUE 'game';
