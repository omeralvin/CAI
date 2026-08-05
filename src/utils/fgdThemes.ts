import { FgdTheme } from '../types';
import { API_BASE_URL } from '../api';

export function getHeaders() {
  const token = localStorage.getItem('cai_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export async function fetchFgdThemes(): Promise<FgdTheme[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/notulis/themes`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Label dropdown: "Sesi 1: tema" (atau "Sesi 1" bila tema kosong). */
export function fgdThemeLabel(t: FgdTheme): string {
  return t.theme.trim() ? `${t.name}: ${t.theme.trim()}` : t.name;
}

export function fgdThemeLabelFor(themes: FgdTheme[], name: string): string {
  const t = themes.find(x => x.name === name);
  return t ? fgdThemeLabel(t) : name;
}
