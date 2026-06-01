/**
 * Datetime storage-type convention (#105).
 *
 * Timestamps are stored in one of two forms depending on the table family.
 * Cross-table/cleanup code must compare against a cutoff of the MATCHING type —
 * mixing them makes a `lt`/`gte` comparison silently always-true/always-false
 * (e.g. an INTEGER epoch column compared to an ISO string). These helpers are
 * the single place that knows the type-to-cutoff mapping, so callers pick the
 * one matching the column instead of hand-writing `new Date(...).toISOString()`.
 *
 *  - INTEGER epoch ms — the token / email family:
 *    password_reset_tokens, email_verification_tokens, email_change_requests,
 *    email_delivery_logs, email_rate_limits (expires_at / created_at).  -> epochCutoff
 *
 *  - TEXT ISO8601 — everything else:
 *    users, weight_records, meal_records, exercise_records, ai_usage_records,
 *    webauthn (passkey_credentials / webauthn_challenges).  -> isoCutoff
 *    (recorded_at carries a local "+09:00" offset; created_at / updated_at are UTC "Z".)
 */

/** Cutoff for INTEGER epoch-ms columns: the epoch ms `ageMs` before `now`. */
export function epochCutoff(now: number, ageMs: number): number {
  return now - ageMs;
}

/** Cutoff for TEXT ISO8601 columns: the ISO string `ageMs` before `now`. */
export function isoCutoff(now: number, ageMs: number): string {
  return new Date(now - ageMs).toISOString();
}
