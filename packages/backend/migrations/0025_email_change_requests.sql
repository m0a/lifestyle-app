-- Migration: Email Change Requests Table
-- Purpose: Track email change requests for existing users
-- Created: 2026-01-10

CREATE TABLE IF NOT EXISTS email_change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  cancelled_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_email_change_token ON email_change_requests(token);
CREATE INDEX idx_email_change_user_id ON email_change_requests(user_id);
CREATE INDEX idx_email_change_expires_at ON email_change_requests(expires_at);
CREATE INDEX idx_email_change_new_email ON email_change_requests(new_email);
