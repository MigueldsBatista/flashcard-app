type DateLike = string | Date;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates the number of days between the given date and today.
 *
 * @param date - The date to compare against today.
 * @returns The number of days from today to the given date.
 */
export function getDaysSince(date: DateLike): number {
  const now = new Date();
  const pastDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // format: YYYY-MM-DD
  const reviewDay = new Date(pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate());
  const diffTimeMs = reviewDay.getTime() - today.getTime();

  const diffDays = Math.round(diffTimeMs / MS_PER_DAY);

  return diffDays;
}
