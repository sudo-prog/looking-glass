/**
 * BottomSheet — iOS-style bottom sheet component
 * Vanilla JS, no dependencies.
 *
 * Snap points: collapsed (15%), half (50%), full (90%)
 * Touch + mouse drag, backdrop dim + tap-to-dismiss, spring animation.
 *
 * Usage:
 *   const sheet = new BottomSheet({
 *     content: '<p>Sheet content here</p>',
 *     onSnap: (point) => console.log('snapped to', point),
 *   });
 *   document.body.appendChild(sheet.element);
 *   sheet.open('half');
 */
export class BottomSheet {
  static SNAP_COLLAPSED = 0.15;
  static SNAP_HALF = 0.50;
  static SNAP_FULL = 0.90;

  constructor(options = {}) {
    this._content = options.content || '';
    this._onSnap = options.onSnap || null;
    this._onDismiss = options.onDismiss || null;
    this._snapPoints = options.snapPoints || [
      BottomSheet.SNAP_COLLAPSED,
      BottomSheet.SNAP_HALF,
      BottomSheet.SNAP_FULL,
    ];
    this._currentSnap = this._snapPoints[0];
    this._isDragging = false;
    this._dragStartY = 0;
    this._dragStartHeight = 0;
    this._lastDragY = 0;
    this._lastDragTime = 0;
    this._velocity = 0;
    this._animFrame = null;

    this._buildDOM();
    this._bindEvents();
  }

  // ── DOM ──────────────────────────────────────────────

  _buildDOM() {
    // Backdrop
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'bs-backdrop';
    this._backdrop.setAttribute('aria-hidden', 'true');

    // Sheet container
    this._sheet = document.createElement('div');
    this._sheet.className = 'bs-sheet';
    this._sheet.setAttribute('role', 'dialog');
    this._sheet.setAttribute('aria-modal', 'true');

    // Drag handle
    this._handle = document.createElement('div');
    this._handle.className = 'bs-handle';
    const handleBar = document.createElement('div');
    handleBar.className = 'bs-handle-bar';
    this._handle.appendChild(handleBar);

    // Content area
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'bs-content';
    this._contentEl.innerHTML = this._content;

    this._sheet.appendChild(this._handle);
    this._sheet.appendChild(this._contentEl);

    // Wrapper (backdrop + sheet)
    this._wrapper = document.createElement('div');
    this._wrapper.className = 'bs-wrapper';
    this._wrapper.style.display = 'none';
    this._wrapper.appendChild(this._backdrop);
    this._wrapper.appendChild(this._sheet);
  }

  // ── Events ───────────────────────────────────────────

  _bindEvents() {
    // Pointer events on handle for drag
    this._handle.addEventListener('pointerdown', this._onPointerDown = (e) => {
      // Only primary button / single touch
      if (e.button !== 0) return;
      e.preventDefault();
      this._startDrag(e.clientY);
      this._handle.setPointerCapture(e.pointerId);
    });

    this._handle.addEventListener('pointermove', this._onPointerMove = (e) => {
      if (!this._isDragging) return;
      e.preventDefault();
      this._doDrag(e.clientY);
    });

    this._handle.addEventListener('pointerup', this._onPointerUp = (e) => {
      if (!this._isDragging) return;
      this._endDrag(e.clientY);
    });

    this._handle.addEventListener('pointercancel', this._onPointerCancel = () => {
      if (!this._isDragging) return;
      this._endDrag(this._lastDragY);
    });

    // Also allow dragging on the sheet body (not just handle)
    this._sheet.addEventListener('pointerdown', this._onSheetPointerDown = (e) => {
      // Only start drag if tapping near the top of the sheet (handle area)
      const rect = this._sheet.getBoundingClientRect();
      if (e.clientY - rect.top > 60) return;
      if (e.button !== 0) return;
      e.preventDefault();
      this._startDrag(e.clientY);
      this._sheet.setPointerCapture(e.pointerId);
    });

    this._sheet.addEventListener('pointermove', this._onSheetPointerMove = (e) => {
      if (!this._isDragging) return;
      e.preventDefault();
      this._doDrag(e.clientY);
    });

    this._sheet.addEventListener('pointerup', this._onSheetPointerUp = (e) => {
      if (!this._isDragging) return;
      this._endDrag(e.clientY);
    });

    // Backdrop tap to dismiss
    this._backdrop.addEventListener('click', this._onBackdropClick = () => {
      this.close();
      if (this._onDismiss) this._onDismiss();
    });

    // Prevent content scroll from leaking to drag
    this._contentEl.addEventListener('touchmove', (e) => {
      // If content is scrollable and not at top, don't interfere
      const el = this._contentEl;
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if (!atTop && !atBottom) {
        e.stopPropagation();
      }
    }, { passive: true });

    // Resize observer to recalculate heights
    this._resizeObserver = new ResizeObserver(() => {
      if (this._isOpen) {
        this._applyHeight(this._currentSnap, false);
      }
    });
    this._resizeObserver.observe(document.body);
  }

  // ── Drag Logic ───────────────────────────────────────

  _startDrag(clientY) {
    this._isDragging = true;
    this._dragStartY = clientY;
    this._lastDragY = clientY;
    this._lastDragTime = performance.now();
    this._velocity = 0;

    const viewportH = window.innerHeight;
    this._dragStartHeight = this._currentSnap;

    this._sheet.style.transition = 'none';
    this._cancelAnim();
  }

  _doDrag(clientY) {
    const now = performance.now();
    const dt = now - this._lastDragTime;
    if (dt > 0) {
      // Velocity in fraction-of-viewport per second
      const dy = this._lastDragY - clientY; // positive = dragging up
      this._velocity = (dy / dt) * 1000;
    }
    this._lastDragY = clientY;
    this._lastDragTime = now;

    const viewportH = window.innerHeight;
    const dy = this._dragStartY - clientY; // positive = up
    const dyFraction = dy / viewportH;
    let newHeight = this._dragStartHeight + dyFraction;

    // Rubber-band beyond limits
    if (newHeight > this._snapPoints[this._snapPoints.length - 1]) {
      const over = newHeight - this._snapPoints[this._snapPoints.length - 1];
      newHeight = this._snapPoints[this._snapPoints.length - 1] + over * 0.2;
    } else if (newHeight < this._snapPoints[0]) {
      const under = this._snapPoints[0] - newHeight;
      newHeight = this._snapPoints[0] - under * 0.2;
    }

    this._applyHeightRaw(newHeight);
  }

  _endDrag(clientY) {
    this._isDragging = false;
    this._sheet.style.transition = '';

    // Determine target snap: consider velocity + position
    const velocityThreshold = 0.3; // fraction of viewport per second
    let targetSnap;

    if (this._velocity > velocityThreshold) {
      // Flick up → next snap up
      targetSnap = this._snapAbove(this._currentSnap);
    } else if (this._velocity < -velocityThreshold) {
      // Flick down → next snap down
      targetSnap = this._snapBelow(this._currentSnap);
    } else {
      // No flick → nearest snap
      targetSnap = this._nearestSnap(this._currentSnap);
    }

    this._animateToSnap(targetSnap);
  }

  _snapAbove(current) {
    for (const sp of this._snapPoints) {
      if (sp > current + 0.02) return sp;
    }
    return this._snapPoints[this._snapPoints.length - 1];
  }

  _snapBelow(current) {
    for (let i = this._snapPoints.length - 1; i >= 0; i--) {
      if (this._snapPoints[i] < current - 0.02) return this._snapPoints[i];
    }
    return this._snapPoints[0];
  }

  _nearestSnap(current) {
    let best = this._snapPoints[0];
    let bestDist = Math.abs(current - best);
    for (let i = 1; i < this._snapPoints.length; i++) {
      const dist = Math.abs(current - this._snapPoints[i]);
      if (dist < bestDist) {
        bestDist = dist;
        best = this._snapPoints[i];
      }
    }
    return best;
  }

  // ── Spring Animation ─────────────────────────────────

  _animateToSnap(target) {
    this._cancelAnim();

    const start = this._currentSnap;
    const delta = target - start;
    if (Math.abs(delta) < 0.001) {
      this._applyHeight(target, true);
      return;
    }

    // Spring physics: damping ~0.8, stiffness tuned for ~300ms settle
    const stiffness = 300;
    const damping = 0.8;
    const mass = 1;
    const omega = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = (now - startTime) / 1000;
      let displacement;

      if (zeta < 1) {
        // Underdamped
        const wd = omega * Math.sqrt(1 - zeta * zeta);
        const envelope = Math.exp(-zeta * omega * elapsed);
        displacement = delta * (1 - envelope * (Math.cos(wd * elapsed) + (zeta * omega / wd) * Math.sin(wd * elapsed)));
      } else {
        // Critically damped
        const r = -omega * elapsed;
        displacement = delta * (1 - (1 + omega * elapsed) * Math.exp(r));
      }

      const current = start + displacement;
      this._applyHeightRaw(current);

      // Check if settled
      const velocity = Math.abs(delta) * envelope * omega; // rough
      if (elapsed > 0.6 || (Math.abs(displacement - delta) < 0.002 && velocity < 0.01)) {
        this._applyHeight(target, true);
        this._animFrame = null;
      } else {
        this._animFrame = requestAnimationFrame(tick);
      }
    };

    this._animFrame = requestAnimationFrame(tick);
  }

  _cancelAnim() {
    if (this._animFrame !== null) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  // ── Height Application ───────────────────────────────

  _applyHeight(fraction, notify) {
    this._currentSnap = Math.max(0, Math.min(1, fraction));
    this._applyHeightRaw(this._currentSnap);
    if (notify && this._onSnap) {
      this._onSnap(this._currentSnap);
    }
  }

  _applyHeightRaw(fraction) {
    const viewportH = window.innerHeight;
    const height = Math.round(fraction * viewportH);
    this._sheet.style.height = `${height}px`;

    // Backdrop opacity: 0 at collapsed, 0.5 at full
    const backdropOpacity = Math.min(1, Math.max(0, (fraction - this._snapPoints[0]) / (this._snapPoints[this._snapPoints.length - 1] - this._snapPoints[0]))) * 0.5;
    this._backdrop.style.opacity = backdropOpacity;

    // Content scrollability: only scrollable at full height
    if (fraction >= this._snapPoints[this._snapPoints.length - 1] - 0.05) {
      this._contentEl.style.overflowY = 'auto';
    } else {
      this._contentEl.style.overflowY = 'hidden';
    }
  }

  // ── Public API ───────────────────────────────────────

  open(snapIndex = 1) {
    const target = this._snapPoints[Math.min(snapIndex, this._snapPoints.length - 1)];
    this._wrapper.style.display = '';
    this._isOpen = true;

    // Start from collapsed, then animate to target
    this._applyHeightRaw(0);
    // Force reflow
    this._sheet.offsetHeight;
    this._animateToSnap(target);
  }

  close() {
    this._cancelAnim();
    this._isOpen = false;
    this._sheet.style.transition = 'height 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    this._applyHeightRaw(0);
    setTimeout(() => {
      this._wrapper.style.display = 'none';
      this._sheet.style.transition = '';
    }, 260);
  }

  snapTo(index) {
    const target = this._snapPoints[Math.min(index, this._snapPoints.length - 1)];
    this._animateToSnap(target);
  }

  get element() {
    return this._wrapper;
  }

  get currentSnap() {
    return this._currentSnap;
  }

  set content(html) {
    this._content = html;
    this._contentEl.innerHTML = html;
  }

  destroy() {
    this._cancelAnim();
    this._resizeObserver.disconnect();
    this._handle.removeEventListener('pointerdown', this._onPointerDown);
    this._handle.removeEventListener('pointermove', this._onPointerMove);
    this._handle.removeEventListener('pointerup', this._onPointerUp);
    this._handle.removeEventListener('pointercancel', this._onPointerCancel);
    this._sheet.removeEventListener('pointerdown', this._onSheetPointerDown);
    this._sheet.removeEventListener('pointermove', this._onSheetPointerMove);
    this._sheet.removeEventListener('pointerup', this._onSheetPointerUp);
    this._backdrop.removeEventListener('click', this._onBackdropClick);
    this._wrapper.remove();
  }
}
