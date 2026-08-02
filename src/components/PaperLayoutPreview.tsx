import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, LayoutGrid } from 'lucide-react';
import { Participant } from '../types';
import { GridLayoutParams, computeGrid, pageCountFor } from '../utils/idcardLayout';

interface PaperLayoutPreviewProps {
  open: boolean;
  onClose: () => void;
  paperLabel: string;
  paperW: number;
  paperH: number;
  params: GridLayoutParams;
  participants: Participant[];
  templateUrl: string | null;
}

/**
 * Modal simulasi tata letak kertas: menampilkan bagaimana posisi
 * kartu-kartu ID disusun dalam satu lembar halaman kertas.
 */
export const PaperLayoutPreview: React.FC<PaperLayoutPreviewProps> = ({
  open, onClose, paperLabel, paperW, paperH, params, participants, templateUrl,
}) => {
  const layout = useMemo(() => computeGrid(params), [params]);

  const scale = useMemo(() => {
    const maxW = 640;
    const maxH = 560;
    return Math.min(maxW / paperW, maxH / paperH);
  }, [paperW, paperH]);

  const paperPxW = paperW * scale;
  const paperPxH = paperH * scale;
  const cardPxW = params.cardW * scale;
  const cardPxH = params.cardH * scale;
  const gapPx = params.gap * scale;
  const totalPages = pageCountFor(participants.length, layout.perSheet);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Preview Layout Cetak Kertas</h3>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info badges */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold">
                {layout.perSheet} ID card / lembar
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                {layout.cols} kolom × {layout.rows} baris
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                {paperLabel} ({paperW}×{paperH} mm)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                Margin {params.marginTop}/{params.marginBottom}/{params.marginLeft}/{params.marginRight} mm • Gap {params.gap} mm
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                {participants.length} peserta → {totalPages} halaman
              </span>
            </div>

            {/* Paper simulation */}
            <div className="p-6 overflow-auto flex-1">
              <div className="mx-auto rounded-lg shadow-lg bg-white border border-slate-300 relative overflow-hidden"
                style={{ width: paperPxW, height: paperPxH }}>
                {/* Page background */}
                <div className="absolute inset-0 bg-white" />
                {/* Margin guides */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    border: '1px dashed #94a3b8',
                    marginLeft: params.marginLeft * scale,
                    marginTop: params.marginTop * scale,
                    marginRight: params.marginRight * scale,
                    marginBottom: params.marginBottom * scale,
                  }}
                />
                {/* Card slots */}
                {Array.from({ length: layout.perSheet }).map((_, i) => {
                  const col = i % layout.cols;
                  const row = Math.floor(i / layout.cols);
                  const x = params.marginLeft * scale + col * (cardPxW + gapPx);
                  const y = params.marginTop * scale + row * (cardPxH + gapPx);
                  const participant = participants[i];
                  return (
                    <div key={i}
                      className="absolute border overflow-hidden rounded-[3px]"
                      style={{
                        left: x, top: y, width: cardPxW, height: cardPxH,
                        borderColor: participant ? '#3b82f6' : '#e2e8f0',
                        borderStyle: participant ? 'solid' : 'dashed',
                      }}>
                      {participant && templateUrl ? (
                        <img src={templateUrl} alt={`Slot ${i + 1}`} className="w-full h-full object-fill" draggable={false} />
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] leading-tight font-bold text-white bg-slate-900/70 truncate">
                        {participant ? `${i + 1}. ${participant.name}` : `Slot ${i + 1}`}
                      </div>
                    </div>
                  );
                })}
                {/* Page label */}
                <div className="absolute -top-6 left-0 text-[10px] font-bold text-slate-400">
                  Halaman 1 dari {totalPages}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-4 flex items-center justify-center gap-1.5">
                <Printer className="h-3 w-3" />
                Simulasi posisi kartu dalam 1 lembar. Kartu terisi memakai template; kartu kosong ditandai garis putus-putus.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-95 cursor-pointer">
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
