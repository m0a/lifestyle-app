/**
 * 1RM (One Rep Max) Calculator
 * Uses the Epley formula for estimation
 */

/**
 * Calculate estimated 1RM using the Epley formula
 * Formula: 1RM = weight × (1 + 0.0333 × reps)
 *
 * @param weight - Weight lifted in kg (must be > 0)
 * @param reps - Number of repetitions performed (must be >= 1)
 * @returns Estimated 1RM rounded to nearest integer, or 0 for invalid input
 *
 * @example
 * calculate1RM(100, 5) // Returns 117 (100 × 1.1665)
 * calculate1RM(80, 10) // Returns 107 (80 × 1.333)
 * calculate1RM(100, 1) // Returns 100 (actual 1RM)
 */
export function calculate1RM(weight: number, reps: number): number {
  // Validate inputs
  if (weight <= 0 || reps <= 0) {
    return 0;
  }

  // If already 1 rep, the weight is the 1RM
  if (reps === 1) {
    return weight;
  }

  // Epley formula: 1RM = weight × (1 + 0.0333 × reps)
  const estimated = weight * (1 + 0.0333 * reps);
  return Math.round(estimated);
}

/**
 * Check if a given 1RM value is a new personal record
 *
 * @param current1RM - Current set's estimated 1RM
 * @param historicalMax1RM - Previous best 1RM for this exercise
 * @returns True if current1RM exceeds the historical record
 *
 * @example
 * isMaxRM(120, 115) // Returns true (new record)
 * isMaxRM(100, 115) // Returns false (not a record)
 * isMaxRM(115, 115) // Returns false (must exceed, not equal)
 */
export function isMaxRM(current1RM: number, historicalMax1RM: number): boolean {
  return current1RM > historicalMax1RM;
}
