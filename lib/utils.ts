import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const won = (value: number | null | undefined) => value == null ? "—" : Math.round(value).toLocaleString("ko-KR") + "원";
export const percent = (value: number | null | undefined) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
export const dateLabel = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
