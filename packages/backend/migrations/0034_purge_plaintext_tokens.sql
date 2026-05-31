-- #98: password-reset / email-verification / email-change tokens are now stored
-- as SHA-256 hashes instead of the raw value. Rows written before this deploy
-- still hold the RAW (plaintext) token and can no longer be verified (the
-- verifier hashes the submitted token and looks up by hash). Delete the
-- still-pending (unconsumed) ones so that no replayable plaintext token lingers
-- at rest after the cutover. Users with an in-flight link simply re-request.
-- Already-consumed rows are left untouched (their one-time-use guard makes them
-- non-replayable, and they age out via the scheduled cleanup).
DELETE FROM password_reset_tokens WHERE used_at IS NULL;
DELETE FROM email_verification_tokens WHERE used_at IS NULL;
DELETE FROM email_change_requests WHERE confirmed_at IS NULL AND cancelled_at IS NULL;
