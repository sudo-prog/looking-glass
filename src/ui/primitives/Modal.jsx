import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

export default function Modal({
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  overlayClassName,
  labelledBy,
}) {
  // panelRef is intentionally unused: focus management queries the DOM directly.
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const focusTimeout = setTimeout(() => {
      const focusable = document.querySelector(
        '.lg-modal-overlay [tabindex], .lg-modal-overlay input, .lg-modal-overlay textarea, .lg-modal-overlay button'
      );
      if (focusable) focusable.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimeout);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`lg-modal-overlay ${overlayClassName || ''}`}
      role="presentation"
      aria-labelledby={labelledBy}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {children}
    </div>,
    document.body
  );
}
