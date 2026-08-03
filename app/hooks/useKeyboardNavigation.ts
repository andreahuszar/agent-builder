import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from '@/app/constants/navigation';
import { KEYBOARD_SHORTCUTS, announceToScreenReader } from '@/app/utils/accessibility';

interface UseKeyboardNavigationProps {
  onModuleChange?: (moduleId: string) => void;
}

export function useKeyboardNavigation({ onModuleChange }: UseKeyboardNavigationProps = {}) {
  const router = useRouter();

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Check for modifier key (Cmd on Mac, Ctrl on Windows/Linux)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
    
    if (!modifierPressed) return;

    // Prevent default browser shortcuts
    const key = event.key.toUpperCase();
    
    // Module navigation shortcuts (Cmd/Ctrl + 1-7)
    if (key >= '1' && key <= '7') {
      event.preventDefault();
      const index = parseInt(key) - 1;
      
      if (index < NAV_ITEMS.length) {
        const item = NAV_ITEMS[index];
        if (!item.isDisabled) {
          router.push(item.href);
          if (onModuleChange) {
            onModuleChange(item.id);
          }
          announceToScreenReader(`Navigated to ${item.label}`);
        } else {
          announceToScreenReader(`${item.label} is not available in prototype`, 'assertive');
        }
      } else if (index === NAV_ITEMS.length || index === 6) {
        // Settings (first available key when nav is empty, or Cmd/Ctrl + 7)
        router.push(SETTINGS_NAV_ITEM.href);
        if (onModuleChange) {
          onModuleChange('settings');
        }
        announceToScreenReader(`Navigated to ${SETTINGS_NAV_ITEM.label}`);
      }
    }
    
    // Home shortcut (Cmd/Ctrl + H)
    if (key === 'H') {
      event.preventDefault();
      router.push('/settings');
      announceToScreenReader('Navigated to Home');
    }
    
    // Search shortcut (Cmd/Ctrl + /)
    if (event.key === '/') {
      event.preventDefault();
      // Focus search input if it exists
      const searchInput = document.querySelector('[role="search"] input, input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        announceToScreenReader('Search input focused');
      }
    }
  }, [router, onModuleChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Return keyboard shortcuts info for documentation/tooltips
  return {
    shortcuts: KEYBOARD_SHORTCUTS
  };
}