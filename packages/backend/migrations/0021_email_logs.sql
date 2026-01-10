-- Migration: Create email_delivery_logs table
-- Date: 2026-01-10
-- Feature: 019-email-delivery

CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  email_type TEXT NOT NULL CHECK (email_type IN ('password_reset', 'email_verification', 'email_change')),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_email_logs_user_id ON email_delivery_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_delivery_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_delivery_logs(created_at);
CREATE INDEX idx_email_logs_email_type ON email_delivery_logs(email_type);

-- Email rate limits table
CREATE TABLE IF NOT EXISTS email_rate_limits (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0 AND count <= 10),
  expires_at INTEGER NOT NULL
);
