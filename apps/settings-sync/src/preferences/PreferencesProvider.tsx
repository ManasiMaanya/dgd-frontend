import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getPreferencesEngine } from "./engine";
import type {
  LanguageCode,
  PreferenceKey,
  PreferenceRecord,
  PreferenceValues,
  SyncInfo,
  Theme,
} from "./types";

interface PreferencesContextValue {
  values: PreferenceValues;
  record: PreferenceRecord;
  syncInfo: SyncInfo;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: LanguageCode) => void;
  setFontSize: (size: number) => void;
  setPreference: <K extends PreferenceKey>(key: K, value: PreferenceValues[K]) => void;
  reset: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => getPreferencesEngine(), []);
  const [record, setRecord] = useState<PreferenceRecord>(() => engine.getSnapshot());
  const [syncInfo, setSyncInfo] = useState<SyncInfo>(() => engine.getSyncInfo());

  useEffect(() => {
    const unsubscribeState = engine.subscribeState(setRecord);
    const unsubscribeSync = engine.subscribeSync(setSyncInfo);

    engine.start();
    setRecord(engine.getSnapshot());
    setSyncInfo(engine.getSyncInfo());

    return () => {
      unsubscribeState();
      unsubscribeSync();
      engine.stop();
    };
  }, [engine]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      values: record.values,
      record,
      syncInfo,
      setTheme: (theme) => engine.setPreference("theme", theme),
      setLanguage: (language) => engine.setPreference("language", language),
      setFontSize: (fontSize) => engine.setPreference("fontSize", fontSize),
      setPreference: (key, nextValue) => engine.setPreference(key, nextValue),
      reset: () => engine.reset(),
    }),
    [engine, record, syncInfo],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}
