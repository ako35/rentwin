import { useSyncExternalStore } from "react";

// Admin-panel colour scheme. The *choice* is one of "system" | "light" | "dark"
// and is remembered per browser; the *effective* theme is what actually renders
// ("light" / "dark"), resolving "system" against the OS preference live.
//
// Only the admin panel is themed: AdminLayout calls activate() on mount and
// deactivate() on unmount, so the public site and the auth screens never carry
// a `data-theme` / `data-bs-theme` attribute.

const STORAGE_KEY = "rentwinAdminTheme";
const CHOICES = ["system", "light", "dark"];

const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
const mql = canUseDom && window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

const readChoice = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return CHOICES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

const systemTheme = () => (mql && mql.matches ? "dark" : "light");
const resolve = (choice) => (choice === "system" ? systemTheme() : choice);

let active = false;
let state = { choice: readChoice(), effective: resolve(readChoice()) };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

const clearDom = () => {
  if (!canUseDom) return;
  const el = document.documentElement;
  delete el.dataset.theme;
  delete el.dataset.bsTheme;
};

// Light is the baseline — the dark overrides only react to [data-theme="dark"],
// so we mark the document only when dark and strip the attributes otherwise.
const applyToDom = (effective) => {
  if (!canUseDom) return;
  if (effective === "dark") {
    const el = document.documentElement;
    el.dataset.theme = "dark";
    el.dataset.bsTheme = "dark";
  } else {
    clearDom();
  }
};

const sync = () => {
  const choice = readChoice();
  const effective = resolve(choice);
  if (choice !== state.choice || effective !== state.effective) {
    state = { choice, effective };
    emit();
  }
  if (active) applyToDom(state.effective);
};

const onSystemChange = () => {
  if (state.choice === "system") sync();
};

export const setThemeChoice = (choice) => {
  const next = CHOICES.includes(choice) ? choice : "system";
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode — keep it in-memory for the session */
  }
  state = { choice: next, effective: resolve(next) };
  if (active) applyToDom(state.effective);
  emit();
};

// Flip straight to the opposite of what is showing (top-bar quick toggle) — this
// sets an explicit light/dark choice rather than staying on "system".
export const toggleTheme = () => setThemeChoice(state.effective === "dark" ? "light" : "dark");

export const activateAdminTheme = () => {
  active = true;
  applyToDom(resolve(readChoice()));
  if (mql) mql.addEventListener("change", onSystemChange);
};

export const deactivateAdminTheme = () => {
  active = false;
  if (mql) mql.removeEventListener("change", onSystemChange);
  clearDom();
};

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => state;

export const useAdminTheme = () => {
  const { choice, effective } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { choice, effective, setChoice: setThemeChoice, toggle: toggleTheme };
};
