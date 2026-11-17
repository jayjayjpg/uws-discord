export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a wall-clock date+time as experienced in `timeZone` to the
 * correct UTC instant, accounting for DST. Standard dependency-free technique:
 * format the same instant through two different timezones and use the
 * difference as the offset — the ambiguous "parsed in the host's local zone"
 * artifact of `new Date(string)` cancels out because both sides share it.
 * Returns null on invalid input.
 */
export function zonedWallTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date | null {
  if (!isValidTimeZone(timeZone)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return null;

  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(naiveUtc.getTime())) return null;

  const asZoned = new Date(naiveUtc.toLocaleString("en-US", { timeZone }));
  const asUtc = new Date(naiveUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = asUtc.getTime() - asZoned.getTime();

  return new Date(naiveUtc.getTime() + offsetMs);
}
