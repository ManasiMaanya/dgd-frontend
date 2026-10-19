import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getPreferencesEngine } from "./engine";
import {
  PreferencesContext,
  type PreferencesContextValue,
} from "./PreferencesContext";
import type { PreferenceRecord, SyncInfo } from "./types";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => getPreferencesEngine(), []);
  const [record, setRecord] = useState<PreferenceRecord>(() => engine.getSnapshot());
  const [syncInfo, setSyncInfo] = useState<SyncInfo>(() => engine.getSyncInfo());

  useEffect(() => {
    const unsubscribeState = engine.subscribeState(setRecord);
    const unsubscribeSync = engine.subscribeSync(setSyncInfo);

    engine.start();

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
