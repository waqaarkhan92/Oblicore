/**
 * Keyboard Shortcuts Handler
 * Listens for ? key to show shortcuts modal
 */

'use client';

import { useEffect, useState } from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

export function KeyboardShortcutsHandler() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => {
      setIsOpen(true);
    };

    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts);

    return () => {
      window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts);
    };
  }, []);

  return (
    <KeyboardShortcutsModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}

