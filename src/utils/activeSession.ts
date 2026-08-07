import { AttendanceSession } from '../types';

export const EARLY_BUFFER_MINUTES = 30;

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function getSessionPhase(session: AttendanceSession): 'active' | 'soon' | 'upcoming' | 'past' {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = dayNames[now.getDay()];
  const todayStr = now.toISOString().split('T')[0];

  const sessionDate = session.date ? new Date(session.date).toISOString().split('T')[0] : '';
  if (sessionDate !== todayStr && session.dayName !== currentDayName) return 'past';

  const startMinutes = minutesOf(session.startTime);
  const endMinutes = minutesOf(session.endTime);
  const openMinutes = startMinutes - EARLY_BUFFER_MINUTES;

  if (currentTimeMinutes >= openMinutes && currentTimeMinutes <= endMinutes) return 'active';
  if (currentTimeMinutes < openMinutes && currentTimeMinutes >= startMinutes - 120) return 'soon';
  if (currentTimeMinutes < openMinutes) return 'upcoming';
  return 'past';
}

/** Mendeteksi sesi yang sedang/akan berlangsung hari ini. */
export function autoDetectActiveSession(sessionsList: AttendanceSession[]): string | null {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = dayNames[now.getDay()];
  const todayStr = now.toISOString().split('T')[0];

  const todaySessions = sessionsList.filter((s) => {
    const sessionDate = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
    return sessionDate === todayStr || s.dayName === currentDayName;
  });

  for (const session of todaySessions) {
    const startMinutes = minutesOf(session.startTime);
    const endMinutes = minutesOf(session.endTime);
    const openMinutes = startMinutes - EARLY_BUFFER_MINUTES;

    if (currentTimeMinutes >= openMinutes && currentTimeMinutes <= endMinutes) {
      return session.id;
    }
  }

  let closestSession: AttendanceSession | null = null;
  let smallestDiff = Infinity;
  const MAX_UPCOMING_WINDOW = 120;

  for (const session of todaySessions) {
    const startMinutes = minutesOf(session.startTime);
    const endMinutes = minutesOf(session.endTime);

    if (currentTimeMinutes > endMinutes) continue;

    const diff = startMinutes - currentTimeMinutes;
    if (diff >= 0 && diff < smallestDiff && diff <= MAX_UPCOMING_WINDOW) {
      smallestDiff = diff;
      closestSession = session;
    }
  }

  return closestSession ? closestSession.id : null;
}
