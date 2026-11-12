// The logged-in dispatcher. Tools never take a user id as an argument.
export const CURRENT_USER_ID = "D001";

// "13:15:00" -> "1:15 pm"
export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}
