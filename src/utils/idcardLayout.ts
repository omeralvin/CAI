export interface GridLayoutParams {
  paperW: number;
  paperH: number;
  cardW: number;
  cardH: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  gap: number;
}

export interface GridLayout {
  cols: number;
  rows: number;
  perSheet: number;
  usableWidthMM: number;
  usableHeightMM: number;
}

export interface SlotPosition {
  xMM: number;
  yMM: number;
}

/**
 * Hitung berapa kolom & baris ID card yang muat dalam satu lembar kertas,
 * berdasarkan ukuran kertas, ukuran kartu, margin, dan jarak antar kartu.
 */
export function computeGrid(params: GridLayoutParams): GridLayout {
  const { paperW, paperH, cardW, cardH, marginTop, marginBottom, marginLeft, marginRight, gap } = params;
  // Guard: hindari pembagian dengan nol bila kartu/gap tidak wajar.
  const stepX = Math.max(1, cardW + gap);
  const stepY = Math.max(1, cardH + gap);
  const cols = Math.max(1, Math.floor((paperW - marginLeft - marginRight + gap) / stepX));
  const rows = Math.max(1, Math.floor((paperH - marginTop - marginBottom + gap) / stepY));
  return {
    cols,
    rows,
    perSheet: cols * rows,
    usableWidthMM: Math.max(0, paperW - marginLeft - marginRight),
    usableHeightMM: Math.max(0, paperH - marginTop - marginBottom),
  };
}

/** Berapa halaman (lembar) yang dibutuhkan untuk sejumlah kartu. */
export function pageCountFor(cardCount: number, perSheet: number): number {
  return perSheet > 0 ? Math.ceil(cardCount / perSheet) : 0;
}

/** Posisi (dalam mm) kartu ke-index di dalam satu lembar. */
export function slotPosition(index: number, params: GridLayoutParams, layout: GridLayout): SlotPosition {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  return {
    xMM: params.marginLeft + col * (params.cardW + params.gap),
    yMM: params.marginTop + row * (params.cardH + params.gap),
  };
}
