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

/**
 * Convert kg to lbs
 * 1kg = 2.20462lbs
 * @param kg Weight in kilograms
 * @returns Weight in pounds, rounded to 1 decimal place, or null if invalid
 */
export const kgToLbs = (kg: number | null | undefined): number | null => {
  if (kg === null || kg === undefined) {
    return null;
  }
  return Math.round(kg * 2.20462 * 10) / 10;
};

/**
 * Format weight display with both kg and lbs
 * @param kg Weight in kilograms
 * @returns Formatted string like "45kg (99.2lbs)" or "自重" if null
 */
export const formatWeight = (kg: number | null | undefined): string => {
  if (kg === null || kg === undefined) {
    return '自重';
  }
  const lbs = kgToLbs(kg);
  return `${kg}kg (${lbs}lbs)`;
};

/**
 * Format RM display
 * @param weight Weight in kg
 * @param reps Number of repetitions
 * @returns Formatted RM string or empty string if not applicable
 */
export const formatRM = (weight: number | null | undefined, reps: number): string => {
  const rm = calculateRM(weight, reps);
  if (rm === null) {
    return '';
  }
  return `推定1RM: ${rm}kg`;
};
