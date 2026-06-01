-- Migration 0036: per-user lifetime AI token rollup (#104)
--
-- ai_usage_records is append-only and will be pruned (~90 days) by the retention
-- cron. The settings screen shows a lifetime "total tokens" figure, which would
-- shrink if it kept summing the (now-pruned) detail rows. This rollup holds the
-- lifetime total per user; recordUsage increments it on every call and
-- getSummary reads it, so the displayed total stays correct after pruning.
--
-- Backfill the rollup from the existing detail rows so totals are accurate from
-- day one (including usage recorded before this migration).

CREATE TABLE ai_usage_totals (
  user_id TEXT PRIMARY KEY NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO ai_usage_totals (user_id, total_tokens, updated_at)
SELECT user_id, COALESCE(SUM(total_tokens), 0), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
FROM ai_usage_records
GROUP BY user_id;
