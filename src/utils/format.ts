/**
 * Format durasi keterlambatan (menit) menjadi teks yang mudah dibaca.
 * Sinkron dengan BackEnd/src/utils/lateStatus.ts (formatLateDuration).
 * - <= 60 menit -> "12 menit" / "60 menit"
 * - > 60 menit  -> "2 jam 15 menit", "5 jam 0 menit"
 */
export function formatLateDuration(minutes?: number | null): string {
  const total = Math.max(0, Math.floor(minutes ?? 0));
  if (total <= 60) {
    return `${total} menit`;
  }
  const jam = Math.floor(total / 60);
  const sisa = total % 60;
  return `${jam} jam ${sisa} menit`;
}
