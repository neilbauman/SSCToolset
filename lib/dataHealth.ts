// /lib/dataHealth.ts
export type HealthLevel = "good" | "moderate" | "poor";

export function computeHealthLevel(completeness: number, missingAdmins: number): HealthLevel {
  if (missingAdmins > 10 || completeness < 80) return "poor";
  if (missingAdmins > 5 || completeness < 90) return "moderate";
  return "good";
}
