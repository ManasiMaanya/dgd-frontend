import { parseRecord } from "./merge";
import type { PreferenceRecord } from "./types";

export const STORAGE_KEY = "atelier.settings.v1";
export const CHANNEL_NAME = "atelier.settings.sync.v1";

export function readStoredRecord(): PreferenceRecord | null {
  if (typeof window === "undefined") return null;

  try {
    return parseRecord(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredRecord(record: PreferenceRecord): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    // Private browsing, quota, or storage disabled: the in-memory record still works.
    return false;
  }
}

export function applyPreferencesToDocument(record: PreferenceRecord): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = record.values.theme;
  root.lang = record.values.language;
  root.style.setProperty("--app-font-size", `${record.values.fontSize}px`);

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = record.values.theme === "dark" ? "#1b1612" : "#4a2b18";
  }
}
