import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AppSettings, CardRadiusPreset } from "../types/music";
import { DEFAULT_APP_SETTINGS, storage } from "../lib/storage";

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const RADIUS_SCALE: Record<CardRadiusPreset, { sm: string; md: string; lg: string; xl: string }> = {
  sharp: { sm: "8px", md: "10px", lg: "14px", xl: "18px" },
  soft: { sm: "12px", md: "16px", lg: "22px", xl: "28px" },
  round: { sm: "16px", md: "22px", lg: "28px", xl: "34px" },
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-pure-black", settings.pureBlack ? "true" : "false");
    const r = RADIUS_SCALE[settings.cardRadius] || RADIUS_SCALE.soft;
    root.style.setProperty("--radius-sm", r.sm);
    root.style.setProperty("--radius-md", r.md);
    root.style.setProperty("--radius-lg", r.lg);
    root.style.setProperty("--radius-xl", r.xl);
  }, [settings.pureBlack, settings.cardRadius]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS);
    storage.saveSettings(DEFAULT_APP_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
