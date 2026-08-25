/**
 * Datetime storage-type convention (#105).
 *
 * All remaining timestamp columns are TEXT ISO8601:
 *   users, weight_records, meal_records, exercise_records, ai_usage_records,
 *   webauthn (passkey_credentials / webauthn_challenges), mcp_tokens.
 *   (recorded_at carries a local "+09:00" offset; created_at / updated_at are UTC "Z".)
 *
 * There used to be a second family stored as INTEGER epoch ms — the token /
 * email tables (password_reset_tokens, email_verification_tokens,
 * email_change_requests, email_delivery_logs, email_rate_limits) — with a
 * matching epochCutoff helper. Those tables were dropped along with email+
 * password auth (migration 0043), so only the ISO form is left.
 *
 * Keep this helper as the single place that knows the mapping: if an
 * INTEGER-epoch column is ever added, compare it against a matching cutoff
 * rather than an ISO string, or `lt`/`gte` silently becomes always-true or
 * always-false.
 */

/** Cutoff for TEXT ISO8601 columns: the ISO string `ageMs` before `now`. */
export function isoCutoff(now: number, ageMs: number): string {
  return new Date(now - ageMs).toISOString();
}
