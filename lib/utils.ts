import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(time: string): string {
  return time;
}

export function getCurrentDayType(): "MWF" | "TTS" | null {
  const day = new Date().getDay();
  // Monday = 1, Wednesday = 3, Friday = 5
  if ([1, 3, 5].includes(day)) return "MWF";
  // Tuesday = 2, Thursday = 4, Saturday = 6
  if ([2, 4, 6].includes(day)) return "TTS";
  // Sunday = 0
  return null;
}

export function getDayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

export function calculateAttendancePercentage(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

