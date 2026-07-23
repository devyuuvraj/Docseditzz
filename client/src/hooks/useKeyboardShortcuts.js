import { useEffect } from 'react';

/**
 * Registers keyboard shortcuts.
 * @param {Object} map - { 'ctrl+z': fn, 'ctrl+shift+z': fn, 'delete': fn, ... }
 */
export default function useKeyboardShortcuts(map, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

      const combo = [
        e.ctrlKey || e.metaKey ? 'ctrl' : null,
        e.shiftKey ? 'shift' : null,
        e.altKey ? 'alt' : null,
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+');

      if (map[combo]) {
        e.preventDefault();
        map[combo](e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [map, enabled]);
}
