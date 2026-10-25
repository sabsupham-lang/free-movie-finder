"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./Icons";

type Theme = "light" | "dark" | "system";
const KEY = "theme";

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
}

const effectiveDark = (t: Theme) =>
  t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

// One-tap switch in the header: flips between light and dark. The full
// three-way choice (including "match my device") lives on the settings page.
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(effectiveDark(readTheme())), []);
  if (dark === null) return <span className="btn icon-btn" aria-hidden="true" style={{ visibility: "hidden" }} />;
  return (
    <button
      type="button"
      className="btn icon-btn"
      onClick={() => {
        applyTheme(dark ? "light" : "dark");
        setDark(!dark);
      }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

export function ThemeSelect() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(readTheme()), []);
  if (!theme) return null;
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 4 }}>Theme</legend>
      {(["system", "light", "dark"] as const).map((t) => (
        <label key={t} className="checkbox">
          <input
            type="radio"
            name="theme"
            value={t}
            checked={theme === t}
            onChange={() => {
              applyTheme(t);
              setTheme(t);
            }}
          />
          {t === "system" ? "Match my device" : t === "light" ? "Light" : "Dark"}
        </label>
      ))}
    </fieldset>
  );
}

// Runs before first paint so the saved theme never flashes the wrong colors.
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
