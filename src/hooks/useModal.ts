"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Shared hook for accessible modals: focus trap, Escape key, restore focus.
 * Attach the returned ref to the outermost modal container div.
 */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const modal = ref.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;

    // Auto-focus first focusable element (unless autoFocus is already set)
    const modal = ref.current;
    if (modal) {
      const autoFocused = modal.querySelector<HTMLElement>("[autofocus]");
      if (!autoFocused) {
        const first = modal.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, [handleKeyDown]);

  return ref;
}
