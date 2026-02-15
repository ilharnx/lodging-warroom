-- Add new reaction type enum values
ALTER TYPE "ReactionType" ADD VALUE IF NOT EXISTS 'positive';
ALTER TYPE "ReactionType" ADD VALUE IF NOT EXISTS 'maybe';

-- Migrate existing reactions: fire/love → positive, think → maybe
UPDATE "Vote" SET "reactionType" = 'positive' WHERE "reactionType" IN ('fire', 'love');
UPDATE "Vote" SET "reactionType" = 'maybe' WHERE "reactionType" = 'think';
