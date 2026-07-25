import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Participant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import {
  CreditCard, Upload, Download, Settings, Eye, Users, Check,
  ChevronDown, ChevronUp, Image as ImageIcon, RefreshCw, PackageOpen,
  Type, AlignLeft, Sliders, GripHorizontal, Maximize, Printer
} from 'lucide-react';

const MM_TO_PX = 96 / 25.4;

interface TextConfig {
  x: number; y: number; fontSize: number; color: string;
  fontWeight: 'normal' | 'bold'; align: CanvasTextAlign;
}

interface QRConfig {
  x: number; y: number; size: number;
}

interface CardConfig {
  name: TextConfig; group: TextConfig; origin: TextConfig; qr: QRConfig;
}

type DragTarget = 'name' | 'group' | 'origin' | 'qr' | null;

interface PaperPreset { label: string; widthMM: number; heightMM: number; }
const PAPER_PRESETS: PaperPreset[] = [
  { label: 'A4', widthMM: 210, heightMM: 297 },
  { label: 'A3', widthMM: 297, heightMM: 420 },
  { label: 'Letter', widthMM: 216, heightMM: 279 },
  { label: 'Kustom', widthMM: 210, heightMM: 297 },
];

const MM = (v: number) => `${v} mm`;

const DEFAULT_CONFIG: CardConfig = {
  name: { x: 50, y: 180, fontSize: 22, color: '#1e293b', fontWeight: 'bold', align: 'left' },
  group: { x: 50, y: 210, fontSize: 13, color: '#475569', fontWeight: 'normal', align: 'left' },
  origin: { x: 50, y: 230, fontSize: 13, color: '#475569', fontWeight: 'normal', align: 'left' },
  qr: { x: 460, y: 175, size: 110 },
};

function qrToDataUrl(text: string, size: number): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: '#1e293b', light: 'transparent' } });
}

const renderCard = async (
  canvas: HTMLCanvasElement, template: HTMLImageElement,
  participant: Participant, config: CardConfig,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = template.naturalWidth || 640;
  canvas.height = template.naturalHeight || 400;

  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  ctx.font = `${config.name.fontWeight} ${config.name.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = config.name.color;
  ctx.textAlign = config.name.align;
  ctx.fillText(participant.name, config.name.x, config.name.y);

  ctx.font = `${config.group.fontWeight} ${config.group.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = config.group.color;
  ctx.textAlign = config.group.align;
  ctx.fillText(participant.group, config.group.x, config.group.y);

  ctx.font = `${config.origin.fontWeight} ${config.origin.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = config.origin.color;
  ctx.textAlign = config.origin.align;
  ctx.fillText(`Asal: ${participant.origin}`, config.origin.x, config.origin.y);

  try {
    const qrDataUrl = await qrToDataUrl(participant.id, config.qr.size);
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = qrDataUrl; });
    ctx.drawImage(img, config.qr.x, config.qr.y, config.qr.size, config.qr.size);
  } catch (e) {
    console.warn('QR generation error for:', participant.id, e);
  }
};

function renderMultiCardSheet(
  canvas: HTMLCanvasElement, template: HTMLImageElement,
  participants: Participant[], config: CardConfig,
  paperW: number, paperH: number, cardW: number, cardH: number,
  marginTop: number, marginBottom: number, marginLeft: number, marginRight: number,
  gap: number,
) {
  const pw = Math.round(paperW * MM_TO_PX);
  const ph = Math.round(paperH * MM_TO_PX);
  const cw = Math.round(cardW * MM_TO_PX);
  const ch = Math.round(cardH * MM_TO_PX);
  const mt = Math.round(marginTop * MM_TO_PX);
  const mb = Math.round(marginBottom * MM_TO_PX);
  const ml = Math.round(marginLeft * MM_TO_PX);
  const mr = Math.round(marginRight * MM_TO_PX);
  const g = Math.round(gap * MM_TO_PX);

  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pw, ph);

  const cols = Math.floor((pw - ml - mr + g) / (cw + g));
  const rows = Math.floor((ph - mt - mb + g) / (ch + g));

  const used = participants.slice(0, cols * rows);

  used.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = ml + col * (cw + g);
    const y = mt + row * (ch + g);

    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = template.naturalWidth || 640;
    cardCanvas.height = template.naturalHeight || 400;
    const cardCtx = cardCanvas.getContext('2d');
    if (!cardCtx) return;

    cardCtx.drawImage(template, 0, 0, cardCanvas.width, cardCanvas.height);

    cardCtx.font = `${config.name.fontWeight} ${config.name.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    cardCtx.fillStyle = config.name.color;
    cardCtx.textAlign = config.name.align;
    cardCtx.fillText(p.name, config.name.x, config.name.y);

    cardCtx.font = `${config.group.fontWeight} ${config.group.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    cardCtx.fillStyle = config.group.color;
    cardCtx.textAlign = config.group.align;
    cardCtx.fillText(p.group, config.group.x, config.group.y);

    cardCtx.font = `${config.origin.fontWeight} ${config.origin.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    cardCtx.fillStyle = config.origin.color;
    cardCtx.textAlign = config.origin.align;
    cardCtx.fillText(`Asal: ${p.origin}`, config.origin.x, config.origin.y);

    qrToDataUrl(p.id, config.qr.size).then(qrDataUrl => {
      const qrImg = new Image();
      qrImg.onload = () => {
        cardCtx.drawImage(qrImg, config.qr.x, config.qr.y, config.qr.size, config.qr.size);
        ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, cw, ch);
      };
      qrImg.src = qrDataUrl;
    });
  });
}

function hitTest(
  clickX: number, clickY: number,
  config: CardConfig, templateW: number, templateH: number
): DragTarget {
  const threshold = 30;
  const hits: { target: DragTarget; dist: number }[] = [];

  const check = (target: DragTarget, cx: number, cy: number) => {
    const d = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2);
    if (d < threshold) hits.push({ target, dist: d });
  };
  check('name', config.name.x, config.name.y);
  check('group', config.group.x, config.group.y);
  check('origin', config.origin.x, config.origin.y);
  check('qr', config.qr.x + config.qr.size / 2, config.qr.y + config.qr.size / 2);

  hits.sort((a, b) => a.dist - b.dist);
  return hits.length > 0 ? hits[0].target : null;
}

// --- UI Helpers ---

interface SliderRowProps {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; unit?: string; step?: number;
}
const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, onChange, unit = '', step = 1 }) => (
  <div className="flex items-center gap-3">
    <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">{label}</label>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="flex-1 h-1 accent-blue-500" />
    <span className="text-[11px] font-mono text-slate-300 w-14 text-right">{value}{unit}</span>
  </div>
);

export const AdminIdCard: React.FC = () => {
  const { participants } = useApp();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);
  const [templateImg, setTemplateImg] = useState<HTMLImageElement | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('name');
  const [toast, setToast] = useState<string | null>(null);

  // Drag state
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [isDragMoving, setIsDragMoving] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // Paper & Card sizes (mm)
  const [paperPreset, setPaperPreset] = useState('A4');
  const [paperW, setPaperW] = useState(210);
  const [paperH, setPaperH] = useState(297);
  const [cardW, setCardW] = useState(85);
  const [cardH, setCardH] = useState(54);
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);
  const [gap, setGap] = useState(5);

  // Sheet preview
  const [sheetParticipants, setSheetParticipants] = useState<Participant[]>([]);
  const [sheetBlobUrl, setSheetBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (participants.length > 0 && !previewParticipant) {
      setPreviewParticipant(participants[0]);
    }
  }, [participants, previewParticipant]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!templateImg || !previewParticipant || !previewCanvasRef.current) return;
    renderCard(previewCanvasRef.current, templateImg, previewParticipant, config);
  }, [templateImg, previewParticipant, config]);

  const loadTemplate = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (PNG/JPG/JPEG)');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setTemplateImg(img); setTemplateUrl(url); };
    img.src = url;
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadTemplate(e.target.files[0]);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) loadTemplate(e.dataTransfer.files[0]);
  };

  const handlePresetChange = (preset: string) => {
    setPaperPreset(preset);
    const found = PAPER_PRESETS.find(p => p.label === preset);
    if (found) { setPaperW(found.widthMM); setPaperH(found.heightMM); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === participants.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(participants.map(p => p.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const downloadSingle = async (p: Participant) => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    const canvas = document.createElement('canvas');
    await renderCard(canvas, templateImg, p, config);
    canvas.toBlob(blob => { if (blob) saveAs(blob, `IDCard_${p.id}.png`); }, 'image/png');
  };

  const downloadSelected = async () => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    const targets = participants.filter(p => selectedIds.has(p.id));
    if (targets.length === 0) { showToast('Pilih minimal 1 peserta!'); return; }
    setIsGenerating(true);
    const zip = new JSZip();
    for (const p of targets) {
      const canvas = document.createElement('canvas');
      await renderCard(canvas, templateImg, p, config);
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));
      zip.file(`IDCard_${p.id}.png`, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `IDCards_CAI_${targets.length}_peserta.zip`);
    setIsGenerating(false);
    showToast(`✅ ${targets.length} ID card berhasil di-generate!`);
  };

  // --- Paper sheet preview ---
  const generateSheetPreview = async () => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    const targets = participants.filter(p => selectedIds.has(p.id));
    if (targets.length === 0) { showToast('Pilih minimal 1 peserta!'); return; }

    const cw = Math.round(cardW * MM_TO_PX);
    const ch = Math.round(cardH * MM_TO_PX);
    const pw = Math.round(paperW * MM_TO_PX);
    const ph = Math.round(paperH * MM_TO_PX);
    const ml = Math.round(marginLeft * MM_TO_PX);
    const mr = Math.round(marginRight * MM_TO_PX);
    const mt = Math.round(marginTop * MM_TO_PX);
    const mb = Math.round(marginBottom * MM_TO_PX);
    const g = Math.round(gap * MM_TO_PX);

    const cols = Math.floor((pw - ml - mr + g) / (cw + g));
    const perSheet = cols * Math.floor((ph - mt - mb + g) / (ch + g));

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = pw;
    sheetCanvas.height = ph;
    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pw, ph);

    const used = targets.slice(0, perSheet);
    setSheetParticipants(used);

    for (let i = 0; i < used.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = ml + col * (cw + g);
      const y = mt + row * (ch + g);

      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = templateImg.naturalWidth || 640;
      cardCanvas.height = templateImg.naturalHeight || 400;
      await renderCard(cardCanvas, templateImg, used[i], config);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, cw, ch);
    }

    if (sheetBlobUrl) URL.revokeObjectURL(sheetBlobUrl);
    const blob: Blob = await new Promise(res => sheetCanvas.toBlob(b => res(b!), 'image/png'));
    const url = URL.createObjectURL(blob);
    setSheetBlobUrl(url);
    showToast(`✅ ${used.length} ID card — ${cols} kolom x ${Math.ceil(used.length / cols)} baris`);
  };

  const downloadSheet = async () => {
    if (!sheetBlobUrl) { showToast('Generate sheet preview terlebih dahulu!'); return; }
    const a = document.createElement('a');
    a.href = sheetBlobUrl;
    a.download = `IDCard_Sheet_${paperPreset}.png`;
    a.click();
  };

  const printSheet = () => {
    if (!sheetBlobUrl) { showToast('Generate sheet preview terlebih dahulu!'); return; }
    const w = window.open('');
    if (!w) return;
    w.document.write(`<html><head><title>Cetak ID Card</title><style>body{margin:0;display:flex;justify-content:center}img{max-width:100%}</style></head><body><img src="${sheetBlobUrl}" onload="window.print()" /></body></html>`);
    w.document.close();
  };

  // --- Canvas mouse handlers for drag ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!templateImg || !dragTarget) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (dragTarget === 'qr') {
      const qr = config.qr;
      if (mx >= qr.x && mx <= qr.x + qr.size && my >= qr.y && my <= qr.y + qr.size) {
        setIsDragMoving(true);
        dragStart.current = { x: mx - qr.x, y: my - qr.y };
      }
    } else {
      const cfg = config[dragTarget] as TextConfig;
      if (Math.abs(mx - cfg.x) < 40 && Math.abs(my - cfg.y) < 20) {
        setIsDragMoving(true);
        dragStart.current = { x: mx - cfg.x, y: my - cfg.y };
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragMoving || !dragTarget || !templateImg || !dragStart.current) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const newX = Math.max(0, Math.min(canvas.width, mx - dragStart.current.x));
    const newY = Math.max(0, Math.min(canvas.height, my - dragStart.current.y));

    if (dragTarget === 'qr') {
      setConfig(c => ({ ...c, qr: { ...c.qr, x: newX, y: newY } }));
    } else {
      setConfig(c => ({ ...c, [dragTarget]: { ...c[dragTarget], x: newX, y: newY } as TextConfig }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragMoving(false);
    dragStart.current = null;
  };

  const SectionHeader: React.FC<{ title: string; icon: React.ElementType; section: string }> = ({ title, icon: Icon, section }) => (
    <button onClick={() => setOpenSection(openSection === section ? null : section)}
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
        <Icon className="h-3.5 w-3.5 text-blue-400" /> {title}
      </div>
      {openSection === section ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
    </button>
  );

  const TextConfigPanel: React.FC<{ cfg: TextConfig; update: (k: keyof TextConfig, v: unknown) => void }> = ({ cfg, update }) => (
    <div className="space-y-3 px-1 py-3">
      <SliderRow label="X (kiri)" value={cfg.x} min={0} max={800} onChange={v => update('x', v)} unit="px" />
      <SliderRow label="Y (atas)" value={cfg.y} min={0} max={800} onChange={v => update('y', v)} unit="px" />
      <SliderRow label="Font Size" value={cfg.fontSize} min={8} max={64} onChange={v => update('fontSize', v)} unit="px" />
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">Warna</label>
        <input type="color" value={cfg.color} onChange={e => update('color', e.target.value)} className="w-8 h-7 rounded cursor-pointer border border-slate-700 bg-slate-800" />
        <span className="text-[11px] font-mono text-slate-400">{cfg.color}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">Bold</label>
        <button type="button" onClick={() => update('fontWeight', cfg.fontWeight === 'bold' ? 'normal' : 'bold')}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${cfg.fontWeight === 'bold' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
          {cfg.fontWeight === 'bold' ? 'Bold ON' : 'Bold OFF'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Cetak ID Card Kustom
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload desain template, atur posisi elemen via drag-and-drop, lalu generate ID card.
          </p>
        </div>
        <button onClick={() => setConfig(DEFAULT_CONFIG)}
          className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" /> Reset Konfigurasi
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: Config Panel */}
        <div className="xl:col-span-4 space-y-4">

          {/* Upload Template */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">1. Upload Template</h3>
            </div>
            <div className="p-5">
              <label
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20'}`}>
                <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileInput} />
                {templateUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={templateUrl} alt="template" className="h-20 w-auto object-contain rounded-lg shadow" />
                    <span className="text-[11px] text-blue-600 font-semibold">Klik untuk ganti</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload className="h-8 w-8" />
                    <span className="text-xs font-semibold">Drag & drop atau klik</span>
                    <span className="text-[10px]">PNG, JPG</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Element Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">2. Atur Posisi (Drag & Drop)</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Drag mode selector */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <GripHorizontal className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-slate-400">Mode Drag:</span>
                <div className="flex gap-1">
                  {(['name', 'group', 'origin', 'qr'] as const).map(t => (
                    <button key={t} onClick={() => { setDragTarget(dragTarget === t ? null : t); }}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${dragTarget === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                      {t === 'name' ? 'Nama' : t === 'group' ? 'Kelompok' : t === 'origin' ? 'Asal' : 'QR'}
                    </button>
                  ))}
                </div>
                {dragTarget && <span className="text-[10px] text-amber-400 ml-1">*drag on canvas</span>}
              </div>

              <SectionHeader title="Nama Peserta" icon={Type} section="name" />
              <AnimatePresence>{openSection === 'name' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <TextConfigPanel cfg={config.name} update={(k, v) => setConfig(c => ({ ...c, name: { ...c.name, [k]: v } }))} />
                </motion.div>
              )}</AnimatePresence>

              <SectionHeader title="Kelompok" icon={AlignLeft} section="group" />
              <AnimatePresence>{openSection === 'group' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <TextConfigPanel cfg={config.group} update={(k, v) => setConfig(c => ({ ...c, group: { ...c.group, [k]: v } }))} />
                </motion.div>
              )}</AnimatePresence>

              <SectionHeader title="Asal Daerah" icon={AlignLeft} section="origin" />
              <AnimatePresence>{openSection === 'origin' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <TextConfigPanel cfg={config.origin} update={(k, v) => setConfig(c => ({ ...c, origin: { ...c.origin, [k]: v } }))} />
                </motion.div>
              )}</AnimatePresence>

              <SectionHeader title="QR Code" icon={Sliders} section="qr" />
              <AnimatePresence>{openSection === 'qr' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-3 px-1 py-3">
                    <SliderRow label="X (kiri)" value={config.qr.x} min={0} max={700} onChange={v => setConfig(c => ({ ...c, qr: { ...c.qr, x: v } }))} unit="px" />
                    <SliderRow label="Y (atas)" value={config.qr.y} min={0} max={700} onChange={v => setConfig(c => ({ ...c, qr: { ...c.qr, y: v } }))} unit="px" />
                    <SliderRow label="Ukuran" value={config.qr.size} min={40} max={300} onChange={v => setConfig(c => ({ ...c, qr: { ...c.qr, size: v } }))} unit="px" />
                  </div>
                </motion.div>
              )}</AnimatePresence>
            </div>
          </div>

          {/* Paper & Card Settings */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <Maximize className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">3. Ukuran Kertas & ID Card</h3>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-semibold text-slate-500 w-28 shrink-0">Jenis Kertas</label>
                <select value={paperPreset} onChange={e => handlePresetChange(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700 outline-none">
                  {PAPER_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} ({p.widthMM}×{p.heightMM} mm)</option>)}
                </select>
              </div>
              {paperPreset === 'Kustom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-semibold text-slate-400">Lebar (mm)</label>
                    <input type="number" value={paperW} onChange={e => setPaperW(Number(e.target.value))} className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                  <div><label className="text-[10px] font-semibold text-slate-400">Tinggi (mm)</label>
                    <input type="number" value={paperH} onChange={e => setPaperH(Number(e.target.value))} className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-slate-400">Lebar ID Card (mm)</label>
                  <input type="number" value={cardW} onChange={e => setCardW(Number(e.target.value))} min={20} max={200}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Tinggi ID Card (mm)</label>
                  <input type="number" value={cardH} onChange={e => setCardH(Number(e.target.value))} min={20} max={200}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Atas (mm)</label>
                  <input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Bawah (mm)</label>
                  <input type="number" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Kiri (mm)</label>
                  <input type="number" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Kanan (mm)</label>
                  <input type="number" value={marginRight} onChange={e => setMarginRight(Number(e.target.value))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
              </div>
              <div><label className="text-[10px] font-semibold text-slate-400">Jarak Antar ID Card (mm)</label>
                <input type="number" value={gap} onChange={e => setGap(Number(e.target.value))} min={0} max={30}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
              {templateImg && (
                <div className="pt-2 text-[11px] text-blue-600 font-semibold">
                  {(() => {
                    const cw = Math.round(cardW * MM_TO_PX);
                    const ch = Math.round(cardH * MM_TO_PX);
                    const pw = Math.round(paperW * MM_TO_PX);
                    const ph = Math.round(paperH * MM_TO_PX);
                    const ml = Math.round(marginLeft * MM_TO_PX);
                    const mr = Math.round(marginRight * MM_TO_PX);
                    const mt = Math.round(marginTop * MM_TO_PX);
                    const mb = Math.round(marginBottom * MM_TO_PX);
                    const g = Math.round(gap * MM_TO_PX);
                    const cols = Math.floor((pw - ml - mr + g) / (cw + g));
                    const rows = Math.floor((ph - mt - mb + g) / (ch + g));
                    return <>Muatan: {cols} kolom × {rows} baris = <strong>{cols * rows}</strong> ID card per lembar</>;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Preview + Download */}
        <div className="xl:col-span-8 space-y-5">

          {/* Preview Canvas with drag */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">4. Preview</h3>
                {dragTarget && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                    Drag mode: {dragTarget === 'name' ? 'Nama' : dragTarget === 'group' ? 'Kelompok' : dragTarget === 'origin' ? 'Asal' : 'QR'} — klik & seret di canvas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-semibold">Peserta:</label>
                <select value={previewParticipant?.id || ''}
                  onChange={e => setPreviewParticipant(participants.find(p => p.id === e.target.value) || null)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-semibold">
                  {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5">
              {!templateImg ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <ImageIcon className="h-10 w-10 mb-3" />
                  <p className="text-sm font-semibold">Upload template untuk melihat preview</p>
                </div>
              ) : (
                <div className="overflow-auto rounded-xl border border-slate-100 bg-slate-50">
                  <canvas ref={previewCanvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="max-w-full h-auto block mx-auto rounded-xl shadow"
                    style={{ imageRendering: 'crisp-edges', cursor: dragTarget ? 'grab' : 'default' }} />
                </div>
              )}
              {templateImg && previewParticipant && (
                <div className="mt-3 flex justify-end">
                  <button onClick={() => downloadSingle(previewParticipant)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer">
                    <Download className="h-3.5 w-3.5" /> Download Preview
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Paper Sheet Preview */}
          {templateImg && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">5. Sheet Preview ({paperPreset})</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={generateSheetPreview} disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  {sheetBlobUrl && (
                    <>
                      <button onClick={downloadSheet}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer">
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                      <button onClick={printSheet}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer">
                        <Printer className="h-3.5 w-3.5" /> Cetak
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-5">
                {!sheetBlobUrl ? (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                    <Printer className="h-8 w-8 mb-2" />
                    <p className="text-xs font-semibold">Pilih peserta & klik Preview untuk melihat tata letak</p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      {(() => {
                        const cw = Math.round(cardW * MM_TO_PX);
                        const ch = Math.round(cardH * MM_TO_PX);
                        const pw = Math.round(paperW * MM_TO_PX);
                        const ph = Math.round(paperH * MM_TO_PX);
                        const ml = Math.round(marginLeft * MM_TO_PX);
                        const mr = Math.round(marginRight * MM_TO_PX);
                        const mt = Math.round(marginTop * MM_TO_PX);
                        const mb = Math.round(marginBottom * MM_TO_PX);
                        const g = Math.round(gap * MM_TO_PX);
                        const cols = Math.max(1, Math.floor((pw - ml - mr + g) / (cw + g)));
                        const rows = Math.max(1, Math.floor((ph - mt - mb + g) / (ch + g)));
                        return `${cols}×${rows} = ${cols * rows} ID card per lembar`;
                      })()}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-100 bg-slate-50">
                    <img src={sheetBlobUrl} alt="Sheet preview" className="max-w-full h-auto block mx-auto rounded-xl shadow" style={{ imageRendering: 'crisp-edges' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participant Selection */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">6. Pilih Peserta</h3>
              </div>
              <button onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 active:scale-95">
                <Check className="h-3.5 w-3.5" /> {selectedIds.size === participants.length ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {participants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Belum ada data peserta.</div>
              ) : (
                participants.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{p.id}</span>
                        <span>•</span><span>{p.group}</span><span>•</span><span>{p.origin}</span>
                      </div>
                    </div>
                    <button type="button" onClick={e => { e.preventDefault(); downloadSingle(p); }}
                      disabled={!templateImg}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all disabled:opacity-30 cursor-pointer"
                      title="Download ID card ini">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </label>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                <span className="font-bold text-slate-800">{selectedIds.size}</span> peserta dipilih dari {participants.length}
              </div>
              <button onClick={downloadSelected} disabled={!templateImg || selectedIds.size === 0 || isGenerating}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-blue-700/15 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed">
                {isGenerating ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</> : <><PackageOpen className="h-4 w-4" /> Download {selectedIds.size} ID Card (.ZIP)</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
