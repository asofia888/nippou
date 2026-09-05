import React, { useEffect, useRef } from 'react';

interface ModalProps {
  /** Accessible name announced when the dialog opens. */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Bottom sheet on phones, centered from `sm` up. */
  align?: 'center' | 'sheet';
  panelClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), ' +
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]';

/**
 * Only the topmost dialog reacts to Escape, and the body stays locked until the
 * last one closes — the settings dialog can open the restore confirmation on
 * top of itself.
 */
const stack: object[] = [];

export const Modal: React.FC<ModalProps> = ({
  label,
  onClose,
  children,
  align = 'center',
  panelClassName = 'max-w-sm',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const token = {};
    stack.push(token);
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    if (stack.length === 1) document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.getAttribute('tabindex') !== '-1',
      );

    (focusables()[0] ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(token), 1);
      if (stack.length === 0) document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex justify-center p-3 sm:p-4 ${
        align === 'sheet' ? 'items-end sm:items-center' : 'items-center'
      }`}
      onMouseDown={(event) => {
        // Only a click that both starts and ends on the backdrop closes it, so
        // dragging a text selection out of the panel does not dismiss it.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={`bg-surface w-full ${panelClassName} rounded-2xl shadow-modal outline-none`}
      >
        {children}
      </div>
    </div>
  );
};
