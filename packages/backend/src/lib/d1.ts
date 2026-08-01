/**
 * D1 statement limits.
 *
 * D1 rejects any statement carrying more than 100 bound parameters with
 * "D1_ERROR: too many SQL variables" — see
 * https://developers.cloudflare.com/d1/platform/limits/
 *
 * This bites specifically on `inArray(col, ids)`, which spends ONE binding per
 * id. Those id lists grow with the user's data (a month of meals, a date
 * range), so the query works in development and starts failing once the user
 * has recorded enough. Any inArray whose length is not a fixed small constant
 * must go through chunkBindings.
 */
export const D1_MAX_BOUND_PARAMS = 100;

/**
 * Split `values` into chunks small enough that one statement per chunk stays
 * within D1's binding limit, so the caller can run the query per chunk and
 * concatenate the rows.
 *
 * `reserved` is the number of bindings the REST of the statement already uses
 * (userId, date bounds, …) — those share the same budget as the inArray list.
 * An empty input yields no chunks, which conveniently skips the query entirely.
 */
export function chunkBindings<T>(values: readonly T[], reserved = 0): T[][] {
  const perChunk = Math.max(1, D1_MAX_BOUND_PARAMS - reserved);
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += perChunk) {
    chunks.push(values.slice(i, i + perChunk));
  }
  return chunks;
}
