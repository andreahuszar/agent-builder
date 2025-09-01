/**
 * Brand Color Constants
 * Centralized color definitions to ensure consistency across the application
 */

export const BRAND_COLORS = {
  // Primary brand button colors
  primary: 'bg-purple-900',
  primaryHover: 'hover:bg-purple-800',
  primaryFocus: 'focus:ring-purple-500',
  primaryText: 'text-white',
  
  // Full primary button class string for convenience
  primaryButton: 'bg-purple-900 hover:bg-purple-800 text-white focus:ring-purple-500',
  
  // Secondary colors (for reference)
  secondary: 'bg-purple-600',
  secondaryHover: 'hover:bg-purple-700',
} as const;

/**
 * Text Color Constants
 * Default text colors for consistency and readability
 */
export const TEXT_COLORS = {
  // Primary text - use for all main content
  default: 'text-gray-950',
  primary: 'text-gray-950',
  
  // Secondary/muted text - only for less important content
  muted: 'text-gray-500',
  secondary: 'text-gray-500',
  
  // Placeholder text for inputs
  placeholder: 'text-gray-400',
  
  // Link colors
  link: 'text-purple-600',
  linkHover: 'hover:text-purple-700',
  
  // Status colors
  error: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-orange-600',
} as const;

// Type-safe brand color getter
export function getBrandButtonClass(variant: 'primary' | 'secondary' = 'primary'): string {
  if (variant === 'primary') {
    return `${BRAND_COLORS.primary} ${BRAND_COLORS.primaryHover} ${BRAND_COLORS.primaryText} transition-colors ${BRAND_COLORS.primaryFocus} focus:ring-offset-2`;
  }
  return `${BRAND_COLORS.secondary} ${BRAND_COLORS.secondaryHover} ${BRAND_COLORS.primaryText} transition-colors ${BRAND_COLORS.primaryFocus} focus:ring-offset-2`;
}