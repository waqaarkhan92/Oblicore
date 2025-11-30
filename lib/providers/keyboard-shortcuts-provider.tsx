/**
 * Keyboard Shortcuts Provider
 * Global keyboard shortcuts system
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 24
 */

'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  global?: boolean; // If true, works everywhere; if false, only in specific contexts
}

interface KeyboardShortcutsContextType {
  registerShortcut: (shortcut: KeyboardShortcut) => () => void;
  unregisterShortcut: (key: string) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const shortcutsRef = React.useRef<Map<string, KeyboardShortcut>>(new Map());

  // Default global shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      {
        key: 'k',
        ctrl: true,
        action: () => {
          // Open search/command palette
          router.push('/dashboard/search');
        },
        description: 'Open search',
        global: true,
      },
      {
        key: 'n',
        ctrl: true,
        action: () => {
          // Open notifications
          router.push('/dashboard/notifications');
        },
        description: 'Open notifications',
        global: true,
      },
      {
        key: 'u',
        ctrl: true,
        action: () => {
          // Upload document
          router.push('/dashboard/documents/upload');
        },
        description: 'Upload document',
        global: true,
      },
      {
        key: 'd',
        ctrl: true,
        action: () => {
          // Go to dashboard
          router.push('/dashboard');
        },
        description: 'Go to dashboard',
        global: true,
      },
      {
        key: '?',
        action: () => {
          // Show keyboard shortcuts help
          const event = new CustomEvent('show-keyboard-shortcuts');
          window.dispatchEvent(event);
        },
        description: 'Show keyboard shortcuts',
        global: true,
      },
    ];

    defaultShortcuts.forEach((shortcut) => {
      shortcutsRef.current.set(shortcut.key + JSON.stringify({ ctrl: shortcut.ctrl, shift: shortcut.shift, alt: shortcut.alt, meta: shortcut.meta }), shortcut);
    });

    return () => {
      defaultShortcuts.forEach((shortcut) => {
        shortcutsRef.current.delete(shortcut.key + JSON.stringify({ ctrl: shortcut.ctrl, shift: shortcut.shift, alt: shortcut.alt, meta: shortcut.meta }));
      });
    };
  }, [router]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow shortcuts with Ctrl/Cmd even in inputs
        if (!event.ctrlKey && !event.metaKey) {
          return;
        }
      }

      const key = event.key.toLowerCase();
      const shortcutKey = key + JSON.stringify({
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      });

      const shortcut = shortcutsRef.current.get(shortcutKey);
      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const key = shortcut.key.toLowerCase() + JSON.stringify({
      ctrl: shortcut.ctrl,
      shift: shortcut.shift,
      alt: shortcut.alt,
      meta: shortcut.meta,
    });
    shortcutsRef.current.set(key, shortcut);

    // Return unregister function
    return () => {
      shortcutsRef.current.delete(key);
    };
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key.toLowerCase());
  }, []);

  return (
    <KeyboardShortcutsContext.Provider value={{ registerShortcut, unregisterShortcut }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

