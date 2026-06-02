-- Migration 0038: trim redundant indexes (#106)
--
-- email_delivery_logs is append-only and the only query against it is the
-- retention cron's `WHERE created_at < cutoff`. Its user_id / status / email_type
-- single-column indexes served no read path (status/email_type are also
-- low-cardinality), so they only cost INSERT time and storage. Drop them and
-- keep idx_email_logs_created_at for the cron. If per-user admin lookups are
-- added later, prefer a (user_id, created_at) composite over a bare user_id index.
DROP INDEX IF EXISTS idx_email_logs_user_id;
DROP INDEX IF EXISTS idx_email_logs_status;
DROP INDEX IF EXISTS idx_email_logs_email_type;

-- users.email_verified is a 2-value column, so a single-column index barely
-- narrows a scan. Its only consumer is the cleanup cron's
-- `WHERE email_verified = 0 AND created_at < cutoff`; a composite on
-- (email_verified, created_at) lets that seek straight to old unverified rows.
DROP INDEX IF EXISTS idx_users_email_verified;
CREATE INDEX IF NOT EXISTS idx_users_email_verified_created ON users(email_verified, created_at);
