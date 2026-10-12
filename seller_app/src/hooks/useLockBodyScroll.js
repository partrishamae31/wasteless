import { useEffect } from "react";

// Body scroll locking needs to be counter-based so stacked modals stay
// consistent (the second modal closing can't unlock the body while the
// first is still open). Lock/unlock events are emitted to subscribers so
// nested overlays can share the lock safely.
let lockCount = 0;
const lockSubscribers = new Set();

export function isBodyScrollLocked() {
  return lockCount > 0;
}

export function onBodyScrollLockChange(cb) {
  lockSubscribers.add(cb);
  return () => lockSubscribers.delete(cb);
}

function emitLockChange() {
  const locked = lockCount > 0;
  lockSubscribers.forEach((cb) => {
    try {
      cb(locked);
    } catch {
      // subscriber errors never break the lock itself
    }
  });
}

function applyLock() {
  const html = document.documentElement;
  html.dataset.wlScrollLock = "1";
  // save pre-lock styles so unlock can restore the page exactly
  html.wlSavedHtmlOverflow = html.style.overflow;
  html.wlSavedBodyOverflow = document.body.style.overflow;
  html.wlSavedBodyPosition = document.body.style.position;
  html.wlSavedBodyTop = document.body.style.top;
  html.wlSavedBodyWidth = document.body.style.width;
  html.wlSavedScrollY = window.scrollY;

  html.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  // position:fixed stops iOS Mobile Safari from scrolling the page
  // behind a fixed-position modal
  document.body.style.position = "fixed";
  document.body.style.top = `-${html.wlSavedScrollY}px`;
  document.body.style.width = "100%";
}

function removeLock() {
  const html = document.documentElement;
  html.style.overflow = html.wlSavedHtmlOverflow || "";
  document.body.style.overflow = html.wlSavedBodyOverflow || "";
  document.body.style.position = html.wlSavedBodyPosition || "";
  document.body.style.top = html.wlSavedBodyTop || "";
  document.body.style.width = html.wlSavedBodyWidth || "";

  const savedScrollY = html.wlSavedScrollY;
  if (typeof savedScrollY === "number") {
    window.scrollTo(0, savedScrollY);
  }

  delete html.wlSavedHtmlOverflow;
  delete html.wlSavedBodyOverflow;
  delete html.wlSavedBodyPosition;
  delete html.wlSavedBodyTop;
  delete html.wlSavedBodyWidth;
  delete html.wlSavedScrollY;
  delete html.dataset.wlScrollLock;
}

/**
 * Lock — and unlock — background page scroll while a modal is open.
 * Uses overflow:hidden on <html> and <body> (plus position:fixed on body)
 * so touch devices can't scroll the page behind a fixed-position modal.
 *
 * Pass `enabled = false` while the modal is closed; the lock is held while
 * at least one owner is active and released when all have released, so it
 * is safe to use in several components at once.
 */
export function useLockBodyScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const isFirst = lockCount === 0;
    lockCount += 1;
    if (isFirst) applyLock();
    emitLockChange();

    return () => {
      lockCount -= 1;
      if (lockCount === 0) removeLock();
      emitLockChange();
    };
  }, [enabled]);
}

/**
 * Escape hatch for non-hook contexts (event handlers, imperative code).
 * Returns `{ release }`, scoped to this owner so nested overlays stay safe.
 */
export function acquireScrollLock() {
  const isFirst = lockCount === 0;
  lockCount += 1;
  if (isFirst) applyLock();
  emitLockChange();

  return {
    release: () => {
      if (lockCount === 0) return;
      lockCount -= 1;
      if (lockCount === 0) removeLock();
      emitLockChange();
    },
  };
}