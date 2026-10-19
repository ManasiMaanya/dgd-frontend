import { describe, expect, it } from "vitest";

import {
  clampFontSize,
  compareStamps,
  createRecord,
  mergeRecords,
  parseRecord,
  resetPreferences,
  sanitizeRecord,
  updatePreference,
} from "./merge";
import { DEFAULT_PREFERENCES, type PreferenceRecord } from "./types";

function concurrentPair(): { a: PreferenceRecord; b: PreferenceRecord } {
  const base = createRecord(DEFAULT_PREFERENCES, "seed");
  const a = updatePreference(base, "theme", "dark", "tab-a", 1000);
  const b = updatePreference(base, "theme", "light", "tab-b", 1000);
  return { a, b };
}

describe("deterministic preference merging", () => {
  it("resolves an equal-clock conflict by actor id in both merge directions", () => {
    const { a, b } = concurrentPair();
    const ab = mergeRecords(a, b);
    const ba = mergeRecords(b, a);

    expect(ab.values.theme).toBe("light");
    expect(ba.values.theme).toBe("light");
    expect(ab.stamps.theme.actor).toBe("tab-b");
    expect(ba.stamps.theme.actor).toBe("tab-b");
  });

  it("keeps concurrent edits to different fields", () => {
    const base = createRecord(DEFAULT_PREFERENCES, "seed");
    const a = updatePreference(base, "theme", "dark", "tab-a", 1000);
    const b = updatePreference(base, "language", "ja", "tab-b", 1000);

    const ab = mergeRecords(a, b);
    const ba = mergeRecords(b, a);

    expect(ab.values).toEqual({ theme: "dark", language: "ja", fontSize: 16 });
    expect(ba.values).toEqual(ab.values);
  });

  it("lets a higher Lamport clock win regardless of merge order", () => {
    const base = createRecord(DEFAULT_PREFERENCES, "seed");
    const first = updatePreference(base, "fontSize", 18, "tab-a", 1000);
    let second = updatePreference(base, "fontSize", 20, "tab-b", 1001);
    second = updatePreference(second, "language", "fr", "tab-b", 1002);

    const merged = mergeRecords(first, second);
    expect(merged.values.fontSize).toBe(20);
    expect(merged.values.language).toBe("fr");
    expect(merged.clock).toBe(2);
  });

  it("reaches the same state when three concurrent edits are merged in any order", () => {
    const base = createRecord(DEFAULT_PREFERENCES, "seed");
    const a = updatePreference(base, "theme", "dark", "tab-a", 1);
    const b = updatePreference(base, "language", "de", "tab-b", 2);
    const c = updatePreference(base, "fontSize", 19, "tab-c", 3);

    const left = mergeRecords(mergeRecords(a, b), c);
    const right = mergeRecords(a, mergeRecords(c, b));

    expect(left.values).toEqual(right.values);
    expect(left.stamps).toEqual(right.stamps);
  });

  it("orders stamps lexicographically by clock then actor", () => {
    expect(compareStamps({ clock: 2, actor: "a", at: 0 }, { clock: 1, actor: "z", at: 0 })).toBe(1);
    expect(compareStamps({ clock: 2, actor: "a", at: 0 }, { clock: 2, actor: "b", at: 0 })).toBe(-1);
    expect(compareStamps({ clock: 2, actor: "b", at: 0 }, { clock: 2, actor: "b", at: 0 })).toBe(0);
  });
});

describe("preference normalization", () => {
  it("clamps and rounds font sizes", () => {
    expect(clampFontSize(-100)).toBe(13);
    expect(clampFontSize(100)).toBe(20);
    expect(clampFontSize(17.4)).toBe(17);
    expect(clampFontSize(Number.NaN)).toBe(16);
  });

  it("resets all fields with one fresh stamp while advancing the clock", () => {
    const base = createRecord({ theme: "dark", language: "ja", fontSize: 20 }, "tab-a");
    const updated = resetPreferences(base, "tab-b", 2000);

    expect(updated.values).toEqual(DEFAULT_PREFERENCES);
    expect(updated.clock).toBe(1);
    expect(updated.stamps.theme).toEqual({ clock: 1, actor: "tab-b", at: 2000 });
    expect(updated.stamps.language).toEqual(updated.stamps.theme);
  });

  it("repairs malformed records defensively", () => {
    const repaired = sanitizeRecord({
      schemaVersion: 1,
      values: { theme: "neon", language: "xx", fontSize: 999 },
      stamps: {},
      clock: -4,
      savedAt: "yesterday",
    });

    expect(repaired?.values).toEqual({ theme: "light", language: "en", fontSize: 20 });
    expect(repaired?.clock).toBe(0);
    expect(repaired?.stamps.theme.actor).toBe("unknown");
  });

  it("returns null for corrupt JSON", () => {
    expect(parseRecord("{not json")).toBeNull();
    expect(parseRecord(null)).toBeNull();
  });
});
