import { createContext, useContext } from "react";

import type {
  LanguageCode,
  PreferenceKey,
  PreferenceRecord,
  PreferenceValues,
  SyncInfo,
  Theme,
} from "./types";

export interface PreferencesContextValue {
  values: PreferenceValues;
  record: PreferenceRecord;
  syncInfo: SyncInfo;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: LanguageCode) => void;
  setFontSize: (size: number) => void;
  setPreference: <K extends PreferenceKey>(key: K, value: PreferenceValues[K]) => void;
  reset: () => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}
