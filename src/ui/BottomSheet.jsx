/**
 * LOOKING GLASS — Bottom Sheet (Phase 5 / V2)
 *
 * Snap points: 15vh (peek), 50vh (default), 90vh (full)
 * Corners: top-only 20px radius, bottom flush
 * Handle: 36×4px, centered, 10px from top
 * Backdrop: rgba(0,0,0,0.40) dim
 * Open spring: stiffness 300, damping 28
 * Snap spring: stiffness 400, damping 30
 * Close: translateY off-screen, 220ms ease-in
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const SNAP_POINTS = {
  full: 15,    // 15% from top = 85% visible (full screen)
  default: 50, // 50% from top = 50% visible
  peek: 90,    // 90% from top = 10% visible (peek)
};

export function BottomSheet({
  isOpen,
  onClose,
  snap = 'default',
  children,
}) {
  const sheetRef = useRef(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentY, setCurrentY] = useState(100); // % from top (100 = off-screen)
  const dragStartY = useRef(0);
  const dragStartTranslateY = useRef(0);

  const targetY = SNAP_POINTS[snap] || SNAP_POINTS.default;

  // Measure sheet height
  useEffect(() => {
    if (sheetRef.current && isOpen) {
      setSheetHeight(sheetRef.current.offsetHeight);
    }
  }, [isOpen, children]);

  // Animate open
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        setCurrentY(targetY);
      });
    }
  }, [isOpen, targetY]);

  // Close handler
  const handleClose = useCallback(() => {
    setCurrentY(100);
    setTimeout(onClose, 220); // match close duration
  }, [onClose]);

  // Backdrop click
  const handleBackdropClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Drag handlers
  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartTranslateY.current = currentY;
    e.target.setPointerCapture?.(e.pointerId);
  }, [currentY]);

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || !sheetHeight) return;
      const deltaY = ((e.clientY - dragStartY.current) / window.innerHeight) * 100;
      const newY = Math.max(
        SNAP_POINTS.peek - 5,
        Math.min(SNAP_POINTS.full + 5, dragStartTranslateY.current + deltaY)
      );
      setCurrentY(newY);
    },
    [isDragging, sheetHeight]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Snap to nearest point
    const points = Object.values(SNAP_POINTS);
    let closest = points[0];
    let minDist = Math.abs(currentY - closest);
    for (const p of points) {
      const dist = Math.abs(currentY - p);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    // If dragged past full toward bottom (past full + 15), close
    if (currentY > SNAP_POINTS.full + 15) {
      handleClose();
    } else {
      setCurrentY(closest);
    }
  }, [isDragging, currentY, handleClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // Using transform instead of top to avoid conflicts with bottom:0
  // translateY(%) is relative to the element's own height
  // At full (15% from top): translate = -(100 - 15) = -85% → 85% visible
  // At peek (90% from top): translate = -(100 - 90) = -10% → 10% visible
  const translateY = -(100 - currentY);
  const sheetStyle = {
    transform: `translateY(${translateY}%)`,
    transition: isDragging
      ? 'none'
      : 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
  };

  return createPortal(
    <div className="bottom-sheet-overlay" onClick={handleBackdropClick}>
      <div
        ref={sheetRef}
        className="bottom-sheet glass-surface"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle */}
        <div
          className="bottom-sheet__handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Content */}
        <div className="bottom-sheet__content">{children}</div>
      </div>
    </div>,
    document.body
  );
}
