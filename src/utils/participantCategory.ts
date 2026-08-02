/**
 * Kategori Peserta vs Panitia (untuk sisi frontend).
 * Sinkron dengan BackEnd/src/utils/participantCategory.ts.
 */
export type ParticipantCategory = 'PESERTA' | 'PANITIA';

export type SessionAudience = 'ALL' | 'PESERTA' | 'PANITIA';

/** Nilai-keterangan yang termasuk kategori Panitia (pencocokan, case-insensitive). */
export const PANITIA_ROLES: string[] = [
  'Panitia',
  'Pemateri',
  '4S Daerah',
];

export function getParticipantCategory(keterangan?: string | null): ParticipantCategory {
  if (!keterangan) return 'PESERTA';
  const normalized = keterangan.trim().toLowerCase();
  if (!normalized) return 'PESERTA';
  const isPanitia = PANITIA_ROLES.some((role) =>
    normalized.includes(role.toLowerCase())
  );
  return isPanitia ? 'PANITIA' : 'PESERTA';
}

export const CATEGORY_LABEL: Record<ParticipantCategory, string> = {
  PESERTA: 'Peserta',
  PANITIA: 'Panitia',
};

export const AUDIENCE_LABEL: Record<SessionAudience, string> = {
  ALL: 'Umum (Semua)',
  PESERTA: 'Khusus Peserta',
  PANITIA: 'Khusus Panitia',
};