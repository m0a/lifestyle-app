-- Migration: Add email_verified column to users table
-- Purpose: Track whether user's email address has been verified
-- Feature: 019-email-delivery (User Story 2 - Email Verification)

-- Add email_verified column (default false for new users)
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Mark all existing users as verified (grandfathering)
-- New users from this point forward will need to verify their email
UPDATE users SET email_verified = 1;

-- Create index for faster queries on verified status
CREATE INDEX idx_users_email_verified ON users(email_verified);
