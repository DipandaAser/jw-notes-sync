/**
 * JW Library-inspired color system for the mobile app.
 * Single source of truth — all screens import from here.
 */

export interface ThemeColors {
  bg: string;
  text: string;
  textMuted: string;
  card: string;
  border: string;
  primary: string;
  primaryLight: string;
  success: string;
  error: string;
  noteCard: string;
  tagBg: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  accent6: string;
}

const lightColors: ThemeColors = {
  bg: '#ffffff',
  text: '#1c1b2e',
  textMuted: '#5a5766',
  card: '#f8f8fa',
  border: '#e0dfe6',
  primary: '#4d2d8e',
  primaryLight: '#6b4bb5',
  success: '#4a8c5c',
  error: '#c0392b',
  noteCard: '#f5e6e0',
  tagBg: '#e8e7ed',
  accent1: '#4d2d8e',
  accent2: '#c49029',
  accent3: '#c0392b',
  accent4: '#4a8c5c',
  accent5: '#0284c7',
  accent6: '#7c3aed',
};

const darkColors: ThemeColors = {
  bg: '#1c1b2e',
  text: '#e8e7f0',
  textMuted: '#a09db5',
  card: '#252438',
  border: '#35334a',
  primary: '#9b7ad8',
  primaryLight: '#b094e4',
  success: '#34d399',
  error: '#f87171',
  noteCard: '#2d2445',
  tagBg: '#3a3852',
  accent1: '#9b7ad8',
  accent2: '#fbbf24',
  accent3: '#f472b6',
  accent4: '#34d399',
  accent5: '#38bdf8',
  accent6: '#a78bfa',
};

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
