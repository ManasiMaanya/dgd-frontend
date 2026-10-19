export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const FONT_SIZE_MIN = 13;
export const FONT_SIZE_MAX = 20;
export const FONT_SIZE_DEFAULT = 16;

export interface PreferenceValues {
  theme: Theme;
  language: LanguageCode;
  fontSize: number;
}

export type PreferenceKey = keyof PreferenceValues;

export interface Stamp {
  /** Lamport logical clock. */
  clock: number;
  /** Stable per-tab identity used as the deterministic tie-breaker. */
  actor: string;
  /** Wall clock time, for display only. Never used for ordering. */
  at: number;
}

export interface PreferenceRecord {
  schemaVersion: 1;
  values: PreferenceValues;
  stamps: Record<PreferenceKey, Stamp>;
  clock: number;
  savedAt: number;
}

export interface SyncInfo {
  peerCount: number;
  latencyMs: number | null;
  lastSyncAt: number | null;
  transport: "broadcast-channel" | "storage" | "local";
  actor: string;
}

export type SyncMessage =
  | { type: "hello"; actor: string; sentAt: number }
  | { type: "heartbeat"; actor: string; sentAt: number }
  | { type: "bye"; actor: string; sentAt: number }
  | { type: "ping"; actor: string; nonce: string; sentAt: number }
  | { type: "pong"; actor: string; nonce: string; sentAt: number; receivedAt: number }
  | {
      type: "state";
      actor: string;
      sentAt: number;
      state: PreferenceRecord;
    };

export const PREFERENCE_KEYS: PreferenceKey[] = ["theme", "language", "fontSize"];

export const DEFAULT_PREFERENCES: PreferenceValues = {
  theme: "light",
  language: "en",
  fontSize: FONT_SIZE_DEFAULT,
};
