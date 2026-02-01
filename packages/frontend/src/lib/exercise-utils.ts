/**
 * Exercise utility functions for RM calculation and unit conversion
 */

/**
 * Calculate estimated 1RM using Epley formula
 * RM = weight × (1 + reps / 30)
 * @param weight Weight in kg
 * @param reps Number of repetitions
 * @returns Estimated 1RM in kg, or null if invalid input
 */
export const calculateRM = (weight: number | null | undefined, reps: number): number | null => {
  if (!weight || weight <= 0 || reps <= 0) {
    return null;
  }
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

