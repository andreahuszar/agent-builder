/**
 * Accessibility utility functions and constants
 */

/**
 * Generate aria-label for navigation items
 */
export function getNavItemAriaLabel(
  label: string,
  isActive?: boolean,
  isDisabled?: boolean
): string {
  const parts = [label];
  
  if (isActive) {
    parts.push('(current page)');
  }
  
  if (isDisabled) {
    parts.push('- Not available in prototype');
  }
  
  return parts.join(' ');
}

/**
 * Keyboard shortcuts mapping
 * Uses Cmd on macOS, Ctrl on Windows/Linux
 */
export const KEYBOARD_SHORTCUTS = {
  // Navigation module shortcuts (Cmd/Ctrl + number)
  INVOICE_PROCESSING: '⌘1 / Ctrl+1',
  TRANSACTIONS: '⌘2 / Ctrl+2',
  STATEMENTS: '⌘3 / Ctrl+3',
  VENDORS: '⌘4 / Ctrl+4',
  REPORTS: '⌘5 / Ctrl+5',
  HELPDESK: '⌘6 / Ctrl+6',
  SETTINGS: '⌘7 / Ctrl+7',
  
  // Quick navigation
  HOME: '⌘H / Ctrl+H',
  SEARCH: '⌘/ / Ctrl+/',
  
  // General
  ESCAPE: 'Escape',
} as const;

/**
 * Get platform-specific keyboard shortcut text
 */
export function getKeyboardShortcut(key: string): string {
  if (typeof window === 'undefined') return `⌘${key} / Ctrl+${key}`;
  
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}

/**
 * Screen reader only class for visually hidden but accessible content
 */
export const SR_ONLY_CLASS = 'sr-only';

/**
 * Focus ring classes for consistent focus indicators
 */
export const FOCUS_RING_CLASS = 'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2';

/**
 * Announce a message to screen readers using aria-live
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = SR_ONLY_CLASS;
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Trap focus within an element (useful for modals/dropdowns)
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusableElement = focusableElements[0] as HTMLElement;
  const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement?.focus();
        e.preventDefault();
      }
    }
  };
  
  element.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}