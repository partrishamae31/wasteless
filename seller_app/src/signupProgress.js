// Persists multi-step signup progress so a browser refresh (or reopening the
// app) restores the signup screen instead of dropping the user into a
// dashboard. Passwords, uploaded files, and scan results are deliberately
// never stored — the user re-enters/re-uploads those after a refresh.
const STORAGE_KEY = "wasteless_signup_progress";

const canUseStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

export const readSignupProgress = () => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const saveSignupProgress = (progress) => {
  if (!canUseStorage() || !progress || typeof progress !== "object") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable/full — signup still works, it just won't restore.
  }
};

export const clearSignupProgress = () => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
};