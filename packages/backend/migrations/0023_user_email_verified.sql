-- Migration: Add email_verified column to users table
-- Purpose: Track whether user's email address has been verified
-- Feature: 019-email-delivery (User Story 2 - Email Verification)

-- Add email_verified column (default false for new users)
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Create index for faster queries on verified status
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Note: Existing users will have email_verified = 0 (false)
-- They can verify via email change flow (User Story 3) if needed
