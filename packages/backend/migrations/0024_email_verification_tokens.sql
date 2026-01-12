-- Migration: Create email_verification_tokens table
-- Purpose: Store tokens for email address verification during signup
-- Feature: 019-email-delivery (User Story 2 - Email Verification)

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast token lookup
CREATE UNIQUE INDEX idx_email_verification_token ON email_verification_tokens(token);

-- Index for user_id lookups (invalidating old tokens)
CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);

-- Index for cleanup of expired tokens
CREATE INDEX idx_email_verification_expires_at ON email_verification_tokens(expires_at);
