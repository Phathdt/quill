import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  if (typeof error === 'string') {
    return error
  }
  return JSON.stringify(error)
}

/**
 * Sanitize SQL identifier (table/column names) to prevent injection
 * Only allows alphanumeric, underscore, and reasonable characters
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  // Remove any characters that aren't alphanumeric, underscore, or hyphen
  const sanitized = identifier.replace(/[^a-zA-Z0-9_-]/g, '')
  // Ensure it doesn't start with a number
  if (/^\d/.test(sanitized)) {
    return `_${sanitized}`
  }
  return sanitized
}
