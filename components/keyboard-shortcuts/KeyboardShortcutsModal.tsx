/**
 * Keyboard Shortcuts Modal
 * Shows available keyboard shortcuts
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 24
 */

'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useKeyboardShortcuts } from '@/lib/providers/keyboard-shortcuts-provider';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Open search' },
    { keys: ['Ctrl', 'N'], description: 'Open notifications' },
    { keys: ['Ctrl', 'U'], description: 'Upload document' },
    { keys: ['Ctrl', 'D'], description: 'Go to dashboard' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ];

  const formatKeys = (keys: string[]) => {
    return keys.map((key, idx) => (
      <React.Fragment key={idx}>
        {idx > 0 && <span className="text-text-tertiary">+</span>}
        <kbd className="px-2 py-1 bg-background-secondary border border-slate rounded text-xs font-mono">
          {key}
        </kbd>
      </React.Fragment>
    ));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-4">
        {shortcuts.map((shortcut, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-slate last:border-0">
            <span className="text-sm text-text-secondary">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {formatKeys(shortcut.keys)}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

