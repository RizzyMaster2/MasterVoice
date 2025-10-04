

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to extract a user-friendly error message
export const getErrorMessage = (error: unknown): string => {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'An unknown error occurred.';
  }

  // Attempt to parse Supabase-specific errors, which might be stringified JSON
  try {
    const parsed = JSON.parse(message);
    return parsed.message || parsed.error_description || parsed.error || message;
  } catch (parseError) {
    // If parsing fails, it's not JSON, so return the original message
    return message;
  }
};
