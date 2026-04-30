import { useEffect } from "react";

/**
 * Provides consistent modal UX behavior:
 * - Escape key closes the modal
 * - Body scroll is locked while open
 * - Focus is trapped inside the modal (Tab / Shift+Tab cycle within)
 */
export function useModalBehavior(open: boolean, onClose: () => void) {
  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;

    const modal = document.querySelector(
      '[role="dialog"][aria-modal="true"]'
    ) as HTMLElement | null;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Auto-focus first focusable element
    first.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
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
    };

    modal.addEventListener("keydown", trap);
    return () => modal.removeEventListener("keydown", trap);
  }, [open]);
}
