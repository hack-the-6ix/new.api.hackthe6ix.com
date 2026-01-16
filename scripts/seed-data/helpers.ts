/**
 * Helper utilities for seeding
 */

/**
 * Create a date relative to now
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Create a specific date
 */
export function makeDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute);
}

/**
 * Log seeding progress
 */
export function logSeed(table: string, count: number) {
  console.log(`  ✓ Seeded ${count} ${table}`);
}

/**
 * Log section header
 */
export function logSection(message: string) {
  console.log(`\n${message}`);
}
