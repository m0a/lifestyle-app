-- Migration 0042: display_name + passkey-only signup
--
-- Auth is moving to passkeys only, with no email-based recovery. That leaves
-- users.email with no job except "the string shown in the UI" — while still
-- carrying a UNIQUE constraint that behaves like an auth rule (two people
-- cannot register the same address). display_name replaces it: cosmetic, not
-- unique, not an identifier. users.email itself is dropped in the follow-up
-- change that removes password auth (dropping it here would mean rebuilding
-- `users` twice, since SQLite cannot drop NOT NULL in place).
--
-- Backfill takes the local part of the address ("abe00makoto@gmail.com" ->
-- "abe00makoto"); the full address reads poorly as a display name. Rows with no
-- '@' fall back to the raw value.
-- Added nullable because SQLite cannot add a NOT NULL column without a default;
-- the backfill below fills every existing row, and the signup path requires it.
-- It becomes NOT NULL in the follow-up change, which rebuilds `users` anyway to
-- drop email / password_hash.
ALTER TABLE users ADD COLUMN display_name TEXT;

UPDATE users
SET display_name = CASE
  WHEN instr(email, '@') > 1 THEN substr(email, 1, instr(email, '@') - 1)
  ELSE email
END
WHERE display_name IS NULL;

-- Passkey registration used to require an existing session (log in with a
-- password, then add a passkey). Signing up with a passkey alone means issuing a
-- challenge for a user that does not exist yet, so the challenge row cannot
-- carry a user_id (the FK would have nothing to point at).
--
-- signup_user_id is the id that user row will be created with. It is minted at
-- /signup/options time because it is handed to the authenticator as the WebAuthn
-- userID (stored there as the userHandle); minting a different id at verify time
-- would make a later second passkey for the same account register under a
-- different handle and show up as a separate account in passkey managers.
--
-- webauthn_challenges.type gains a third value, 'signup', alongside
-- 'registration' / 'authentication'. The column is plain TEXT (the enum lives in
-- Drizzle only), so no DDL change is needed for that.
ALTER TABLE webauthn_challenges ADD COLUMN signup_user_id TEXT;
ALTER TABLE webauthn_challenges ADD COLUMN signup_display_name TEXT;
