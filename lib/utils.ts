import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "long" });
}

export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
