import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { DynamicPalette, ThemePreference } from "../types/music";
import {
  DEFAULT_PALETTE,
  applyDynamicPaletteToDocument,
  extractPaletteFromArtwork,
} from "../lib/colorExtractor";
import { storage } from "../lib/storage";

interface ThemeContextValue {
  themePref: ThemePreference;
  resolvedTheme: "light" | "dark";
  dynamicColor: boolean;
  palette: DynamicPalette;
  setThemePref: (pref: ThemePreference) => void;
  cycleTheme: () => void;
  setDynamicColor: (enabled: boolean) => void;
  syncArtworkPalette: (artworkUrl: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePref, setThemePrefState] = useState<ThemePreference>(() => storage.getThemePref());
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());
  const [dynamicColor, setDynamicColorState] = useState<boolean>(() =>
    storage.getDynamicColorEnabled(),
  );
  const [palette, setPalette] = useState<DynamicPalette>(DEFAULT_PALETTE);

  const resolvedTheme: "light" | "dark" = themePref === "system" ? systemTheme : themePref;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", resolvedTheme === "dark" ? palette.dockBg : "#F6F4EF");
    }
  }, [resolvedTheme, palette.dockBg]);

  useEffect(() => {
    applyDynamicPaletteToDocument(palette, dynamicColor);
  }, [palette, dynamicColor]);

  const setThemePref = useCallback((pref: ThemePreference) => {
    setThemePrefState(pref);
    storage.saveThemePref(pref);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemePrefState((prev) => {
      const next: ThemePreference = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      storage.saveThemePref(next);
      return next;
    });
  }, []);

  const setDynamicColor = useCallback((enabled: boolean) => {
    setDynamicColorState(enabled);
    storage.saveDynamicColorEnabled(enabled);
  }, []);

  const syncArtworkPalette = useCallback((artworkUrl: string) => {
    if (!artworkUrl) {
      setPalette(DEFAULT_PALETTE);
      return;
    }
    let cancelled = false;
    extractPaletteFromArtwork(artworkUrl).then((extracted) => {
      if (!cancelled) {
        setPalette(extracted);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themePref,
        resolvedTheme,
        dynamicColor,
        palette,
        setThemePref,
        cycleTheme,
        setDynamicColor,
        syncArtworkPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
