"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/** Apply a theme to the document and persist it. */
function applyTheme(theme: Theme) {
  // Brief transition class so every element interpolates colors smoothly
  document.documentElement.classList.add("theme-transition");
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("transitops_theme", theme);
  setTimeout(() => {
    document.documentElement.classList.remove("theme-transition");
  }, 400);
}

/**
 * Self-contained theme toggle button.
 * - Reads current preference from localStorage on mount.
 * - Directly sets data-theme on <html> — no context required.
 * - Syncs across multiple instances on the same page via a custom event.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read saved preference (or default to dark)
    const saved = (localStorage.getItem("transitops_theme") as Theme) || "dark";
    setTheme(saved);
    // Ensure DOM is in sync with localStorage on mount
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);

    // Listen for theme-change events dispatched by other ThemeToggle instances
    const onThemeChange = (e: Event) => {
      setTheme((e as CustomEvent<Theme>).detail);
    };
    window.addEventListener("transitops-theme-change", onThemeChange);
    return () => window.removeEventListener("transitops-theme-change", onThemeChange);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    // Notify any other ThemeToggle instances on the page
    window.dispatchEvent(new CustomEvent("transitops-theme-change", { detail: next }));
  };

  // Render a placeholder with the same dimensions to avoid layout shift
  if (!mounted) {
    return (
      <div
        style={{
          display: "inline-flex",
          width: "80px",
          height: "33px",
          borderRadius: "999px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "7px 13px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-default)",
        cursor: "pointer",
        userSelect: "none",
        letterSpacing: "0.02em",
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s, color 0.2s",
      }}
    >
      {/* Icon */}
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px" }}>
        {isDark ? (
          /* ☀ Sun — you are in dark mode, click to go light */
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1"  y1="12" x2="3"  y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
            <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          /* ☽ Moon — you are in light mode, click to go dark */
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </span>

      {/* Label */}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
