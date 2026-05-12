import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CR_TZ = 'America/Costa_Rica'

export function formatDateTimeCR(value: string | Date): string {
  return new Date(value).toLocaleString('es-CR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: CR_TZ,
  })
}

export function formatDateCR(
  value: string | Date,
  dateStyle: 'short' | 'medium' | 'long' = 'short'
): string {
  return new Date(value).toLocaleDateString('es-CR', { dateStyle, timeZone: CR_TZ })
}
