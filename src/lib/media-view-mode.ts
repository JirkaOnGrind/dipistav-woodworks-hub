import { useSyncExternalStore } from "react";

export type MediaViewMode = "visualization" | "gallery";

const DEFAULT_MODE: MediaViewMode = "visualization";
const STORAGE_KEY = "dipistav:product-media-view:v1";
const listeners = new Set<() => void>();

let currentMode: MediaViewMode = DEFAULT_MODE;
let hasReadStorage = false;

function isMediaViewMode(value: string | null): value is MediaViewMode {
  return value === "visualization" || value === "gallery";
}

function readStoredMode() {
  if (typeof window === "undefined" || hasReadStorage) return;
  hasReadStorage = true;

  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    if (isMediaViewMode(storedMode)) currentMode = storedMode;
  } catch {
    // Storage can be unavailable in strict privacy modes; the in-memory mode still works.
  }
}

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !isMediaViewMode(event.newValue)) return;
    currentMode = event.newValue;
    emitChange();
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  readStoredMode();
  return currentMode;
}

function getServerSnapshot() {
  return DEFAULT_MODE;
}

export function setMediaViewMode(mode: MediaViewMode) {
  readStoredMode();
  if (mode === currentMode) return;

  currentMode = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Keep the preference for this page even when persistent storage is unavailable.
  }
  emitChange();
}

export function useMediaViewMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
