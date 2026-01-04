-- Migration: Add AI usage records table
-- Created: 2026-01-04
-- Feature: 014-ai-usage-tracking

CREATE TABLE `ai_usage_records` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `feature_type` text NOT NULL,
  `prompt_tokens` integer NOT NULL,
  `completion_tokens` integer NOT NULL,
  `total_tokens` integer NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `idx_ai_usage_user_date` ON `ai_usage_records` (`user_id`, `created_at`);
