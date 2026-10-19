import {
  DEFAULT_PREFERENCES,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LANGUAGES,
  PREFERENCE_KEYS,
  type LanguageCode,
  type PreferenceKey,
  type PreferenceRecord,
  type PreferenceValues,
  type Stamp,
  type Theme,
} from "./types";

const LANGUAGE_CODES = new Set<string>(LANGUAGES.map((language) => language.code));

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFERENCES.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGE_CODES.has(value);
}

export function normalizeValue<K extends PreferenceKey>(
  key: K,
  value: PreferenceValues[K],
): PreferenceValues[K] {
  if (key === "fontSize") {
    return clampFontSize(value as number) as PreferenceValues[K];
  }
  if (key === "theme") {
    return ((value as string) === "dark" ? "dark" : "light") as PreferenceValues[K];
  }
  return (isLanguageCode(value) ? value : DEFAULT_PREFERENCES.language) as PreferenceValues[K];
}

function normalizeValues(values: Partial<PreferenceValues> | null | undefined): PreferenceValues {
  return {
    theme: normalizeValue("theme", (values?.theme ?? DEFAULT_PREFERENCES.theme) as Theme),
    language: normalizeValue(
      "language",
      (values?.language ?? DEFAULT_PREFERENCES.language) as LanguageCode,
    ),
    fontSize: normalizeValue(
      "fontSize",
      (values?.fontSize ?? DEFAULT_PREFERENCES.fontSize) as number,
    ),
  };
}

function createZeroStamp(actor: string): Stamp {
  return { clock: 0, actor, at: 0 };
}

export function createRecord(values: PreferenceValues, actor: string): PreferenceRecord {
  return {
    schemaVersion: 1,
    values: normalizeValues(values),
    stamps: {
      theme: createZeroStamp(actor),
      language: createZeroStamp(actor),
      fontSize: createZeroStamp(actor),
    },
    clock: 0,
    savedAt: Date.now(),
  };
}

export function updatePreference<K extends PreferenceKey>(
  record: PreferenceRecord,
  key: K,
  value: PreferenceValues[K],
  actor: string,
  now = Date.now(),
): PreferenceRecord {
  const clock = record.clock + 1;

  return {
    ...record,
    values: {
      ...record.values,
      [key]: normalizeValue(key, value),
    },
    stamps: {
      ...record.stamps,
      [key]: { clock, actor, at: now },
    },
    clock,
    savedAt: now,
  };
}

export function resetPreferences(
  record: PreferenceRecord,
  actor: string,
  now = Date.now(),
): PreferenceRecord {
  const clock = record.clock + 1;
  const stamp: Stamp = { clock, actor, at: now };

  return {
    ...record,
    values: { ...DEFAULT_PREFERENCES },
    stamps: {
      theme: stamp,
      language: stamp,
      fontSize: stamp,
    },
    clock,
    savedAt: now,
  };
}

/** Lexicographic ordering by logical clock, then actor identity. */
export function compareStamps(a: Stamp, b: Stamp): number {
  if (a.clock !== b.clock) return a.clock - b.clock;
  if (a.actor === b.actor) return 0;
  return a.actor < b.actor ? -1 : 1;
}

export function mergeRecords(
  local: PreferenceRecord,
  incoming: PreferenceRecord,
): PreferenceRecord {
  const values = { ...local.values };
  const stamps = { ...local.stamps };

  for (const key of PREFERENCE_KEYS) {
    if (compareStamps(incoming.stamps[key], local.stamps[key]) > 0) {
      switch (key) {
        case "theme":
          values.theme = incoming.values.theme;
          break;
        case "language":
          values.language = incoming.values.language;
          break;
        case "fontSize":
          values.fontSize = incoming.values.fontSize;
          break;
      }
      stamps[key] = incoming.stamps[key];
    }
  }

  return {
    schemaVersion: 1,
    values,
    stamps,
    clock: Math.max(local.clock, incoming.clock),
    savedAt: Math.max(local.savedAt, incoming.savedAt),
  };
}

export function recordsEqual(a: PreferenceRecord, b: PreferenceRecord): boolean {
  return PREFERENCE_KEYS.every(
    (key) =>
      a.values[key] === b.values[key] &&
      compareStamps(a.stamps[key], b.stamps[key]) === 0,
  );
}

function isStamp(value: unknown): value is Stamp {
  if (!value || typeof value !== "object") return false;
  const stamp = value as Partial<Stamp>;
  return (
    typeof stamp.clock === "number" &&
    Number.isFinite(stamp.clock) &&
    stamp.clock >= 0 &&
    typeof stamp.actor === "string" &&
    stamp.actor.length > 0 &&
    typeof stamp.at === "number" &&
    Number.isFinite(stamp.at)
  );
}

/**
 * Defensive hydration for anything read from localStorage or another tab.
 * Unknown values degrade to safe defaults instead of poisoning the store.
 */
export function sanitizeRecord(input: unknown): PreferenceRecord | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as Partial<PreferenceRecord>;
  if (raw.schemaVersion !== 1) return null;

  const values = normalizeValues(raw.values);
  const stamps = {} as Record<PreferenceKey, Stamp>;

  for (const key of PREFERENCE_KEYS) {
    const candidate = raw.stamps?.[key];
    stamps[key] = isStamp(candidate) ? { ...candidate } : { clock: 0, actor: "unknown", at: 0 };
  }

  const rawClock = typeof raw.clock === "number" && Number.isFinite(raw.clock) ? raw.clock : 0;
  const highestStamp = Math.max(...PREFERENCE_KEYS.map((key) => stamps[key].clock));

  return {
    schemaVersion: 1,
    values,
    stamps,
    clock: Math.max(rawClock, highestStamp),
    savedAt:
      typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
  };
}

export function parseRecord(raw: string | null): PreferenceRecord | null {
  if (!raw) return null;

  try {
    return sanitizeRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}
