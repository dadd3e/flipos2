import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decodes HTML entities so quotes, inch marks, ampersands, etc. appear properly.
 * Specifically converts &quot; (and &#34;) to " (the symbol for inches / quotes).
 */
export function cleanQuotes(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/&quot;/gi, '"')
    .replace(/&#0*34;/g, '"')
    .replace(/&amp;quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#0*39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}
