import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Participant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import {
  CreditCard, Upload, Download, Settings, Eye, Users, Check,
  ChevronDown, ChevronUp, Image as ImageIcon, RefreshCw, Type,
  Sliders, MousePointerClick, Maximize, Printer, FileDown, Scissors, LayoutGrid,
  Plus, Trash2, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { computeGrid, pageCountFor, slotPosition, GridLayoutParams } from '../utils/idcardLayout';
import { PaperLayoutPreview } from '../components/PaperLayoutPreview';

const MM_TO_PX = 96 / 25.4;

type ParticipantFieldKey = 'id' | 'name' | 'age' | 'gender' | 'group' | 'origin' | 'rfid';

interface FieldOption {
  key: ParticipantFieldKey;
  label: string;
  get: (p: Participant) => string;
}

/** Semua kolom data peserta yang bisa ditampilkan di kartu. */
const FIELD_OPTIONS: FieldOption[] = [
  { key: 'id', label: 'ID Peserta', get: (p) => p.id },
  { key: 'name', label: 'Nama', get: (p) => p.name },
  { key: 'age', label: 'Umur', get: (p) => (p.age != null ? `${p.age} tahun` : '-') },
  { key: 'gender', label: 'Jenis Kelamin', get: (p) => (p.gender === 'P' ? 'Perempuan' : 'Laki-laki') },
  { key: 'group', label: 'Kelompok', get: (p) => p.group },
  { key: 'origin', label: 'Keterangan / Asal', get: (p) => p.origin },
  { key: 'rfid', label: 'Serial RFID', get: (p) => ((p.rfidCardId || '').trim() || '-') },
];

const fieldLabel = (key: ParticipantFieldKey) => FIELD_OPTIONS.find(o => o.key === key)?.label ?? key;
const fieldValue = (key: ParticipantFieldKey, p: Participant) => FIELD_OPTIONS.find(o => o.key === key)?.get(p) ?? '';

interface TextFieldConfig {
  id: string;
  field: ParticipantFieldKey;
  x: number; // kiri atas kotak teks
  y: number; // atas kotak teks
  width: number; // lebar kotak teks (px); teks panjang wrap ke baris berikutnya
  height: number; // tinggi kotak (px). 0 = otomatis mengikuti isi teks.
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  align: CanvasTextAlign;
  fontFamily: string;
  lineHeight: number; // pengali jarak antar baris
  padding: number;    // jarak aman di dalam kotak (px)
  maxLines: number;   // batas jumlah baris (0 = tanpa batas)
  autofit: boolean;   // kecilkan font otomatis agar teks muat dalam maxLines / tinggi kotak
}

interface QRConfig {
  x: number; y: number; size: number;
}

interface CardConfig {
  textFields: TextFieldConfig[];
  qr: QRConfig;
}

type DragTarget = string; // id elemen teks, atau 'qr'
const QR_TARGET = 'qr';

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Inter / Segoe UI (default)', value: "'Inter', 'Segoe UI', sans-serif" },
  { label: 'Poppins', value: "'Poppins', 'Segoe UI', sans-serif" },
  { label: 'Arial / Helvetica', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New (Mono)', value: '"Courier New", Courier, monospace' },
  { label: 'Brush Script MT', value: '"Brush Script MT", cursive' },
  { label: 'Impact (Tebal)', value: 'Impact, "Arial Black", sans-serif' },
];

const DEFAULT_FONT_FAMILY = "'Inter', 'Segoe UI', sans-serif";

interface PaperPreset { label: string; widthMM: number; heightMM: number; }
const PAPER_PRESETS: PaperPreset[] = [
  { label: 'A4', widthMM: 210, heightMM: 297 },
  { label: 'A3', widthMM: 297, heightMM: 420 },
  { label: 'Letter', widthMM: 216, heightMM: 279 },
  { label: 'F4', widthMM: 215, heightMM: 330 },
  { label: 'Kustom', widthMM: 210, heightMM: 297 },
];

const DEFAULT_CONFIG: CardConfig = {
  textFields: [
    { id: 'name', field: 'name', x: 50, y: 150, width: 360, height: 0, fontSize: 22, color: '#1e293b', fontWeight: 'bold', align: 'left', fontFamily: DEFAULT_FONT_FAMILY, lineHeight: 1.25, padding: 8, maxLines: 0, autofit: false },
    { id: 'group', field: 'group', x: 50, y: 190, width: 360, height: 0, fontSize: 13, color: '#475569', fontWeight: 'normal', align: 'left', fontFamily: DEFAULT_FONT_FAMILY, lineHeight: 1.25, padding: 6, maxLines: 0, autofit: false },
    { id: 'origin', field: 'origin', x: 50, y: 210, width: 360, height: 0, fontSize: 13, color: '#475569', fontWeight: 'normal', align: 'left', fontFamily: DEFAULT_FONT_FAMILY, lineHeight: 1.25, padding: 6, maxLines: 0, autofit: false },
  ],
  qr: { x: 460, y: 175, size: 110 },
};

/** Isi QR: pakai Serial RFID peserta (agar absen terdeteksi sebagai RFID langsung);
 *  jika RFID belum dipasang, otomatis fallback ke ID Peserta. */
function qrContent(p: Participant): string {
  const rfid = (p.rfidCardId || '').trim();
  return rfid || p.id;
}

function qrToDataUrl(text: string, size: number): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: '#1e293b', light: 'transparent' } });
}

// Cache hasil QR per konten agar drag & render berulang tetap cepat.
const qrDataUrlCache = new Map<string, string>();
async function qrToDataUrlCached(content: string, size: number): Promise<string> {
  const key = `${content}:${size}`;
  let value = qrDataUrlCache.get(key);
  if (!value) {
    value = await qrToDataUrl(content, size);
    qrDataUrlCache.set(key, value);
  }
  return value;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Ambil elemen teks dari config berdasarkan id-nya. */
function findField(cfg: CardConfig, id: string): TextFieldConfig | undefined {
  return cfg.textFields.find(f => f.id === id);
}

/** Pecah teks menjadi beberapa baris sesuai lebar maksimum (px). maxWidth <= 0 = tanpa batas (1 baris). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  if (maxWidth <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
      if (ctx.measureText(word).width > maxWidth) {
        // Kata tunggal sangat panjang: potong per karakter.
        let chunk = '';
        for (const ch of word) {
          if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface TextLayout {
  fontSize: number;
  lines: string[];
  lineHeight: number;
}

/** Hitung tata letak teks aktual di dalam kotak: wrap + autofit font (jika aktif). */
function computeLayout(t: TextFieldConfig, text: string, ctx: CanvasRenderingContext2D): TextLayout {
  const availWidth = Math.max(10, t.width - t.padding * 2);
  const fitHeight = t.height > 0 ? t.height - t.padding * 2 : 0;
  let size = t.fontSize;
  const measure = (s: number) => {
    ctx.font = `${t.fontWeight} ${s}px ${t.fontFamily}`;
    const lines = wrapText(ctx, text, availWidth);
    return lines;
  };
  let lines = measure(size);
  if (t.autofit && (t.maxLines > 0 || fitHeight > 0)) {
    let guard = 0;
    const tooManyLines = () => t.maxLines > 0 && lines.length > t.maxLines;
    const tooTall = () => fitHeight > 0 && lines.length * size * t.lineHeight > fitHeight;
    while ((tooManyLines() || tooTall()) && size > 6 && guard < 80) {
      size -= 0.5;
      lines = measure(size);
      guard++;
    }
  }
  return { fontSize: size, lines, lineHeight: t.lineHeight };
}

/** Kotak (bounding box) elemen pada canvas dalam koordinat pixel canvas. */
function elementBox(
  cfg: CardConfig, target: DragTarget,
  ctx: CanvasRenderingContext2D, participant: Participant,
): { x: number; y: number; w: number; h: number } {
  if (target === QR_TARGET) {
    const q = cfg.qr;
    return { x: q.x, y: q.y, w: q.size, h: q.size };
  }
  const t = findField(cfg, target);
  if (!t) return { x: 0, y: 0, w: 0, h: 0 };
  const layout = computeLayout(t, fieldValue(t.field, participant), ctx);
  const contentH = t.padding * 2 + layout.lines.length * layout.fontSize * layout.lineHeight;
  return { x: t.x, y: t.y, w: t.width, h: t.height > 0 ? t.height : contentH };
}

/** Deteksi elemen mana yang diklik — elemen terkecil yang memuat titik menang. */
function hitTest(
  px: number, py: number, cfg: CardConfig,
  ctx: CanvasRenderingContext2D, participant: Participant,
): DragTarget | null {
  const pad = 8;
  let best: DragTarget | null = null;
  let bestArea = Infinity;
  const targets: DragTarget[] = [...cfg.textFields.map(f => f.id), QR_TARGET];
  for (const t of targets) {
    const b = elementBox(cfg, t, ctx, participant);
    if (px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad) {
      const area = b.w * b.h;
      if (area < bestArea) { bestArea = area; best = t; }
    }
  }
  return best;
}

/** Arah pegangan resize. */
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_ORDER: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Titik koordinat 8 pegangan resize berdasarkan bounding box elemen. */
function handlePoints(b: { x: number; y: number; w: number; h: number }): Record<ResizeHandle, { x: number; y: number }> {
  return {
    nw: { x: b.x, y: b.y },
    n: { x: b.x + b.w / 2, y: b.y },
    ne: { x: b.x + b.w, y: b.y },
    e: { x: b.x + b.w, y: b.y + b.h / 2 },
    se: { x: b.x + b.w, y: b.y + b.h },
    s: { x: b.x + b.w / 2, y: b.y + b.h },
    sw: { x: b.x, y: b.y + b.h },
    w: { x: b.x, y: b.y + b.h / 2 },
  };
}

/** Gambar seleksi (bounding box) untuk elemen aktif + 8 pegangan resize. */
function drawSelectionBox(
  ctx: CanvasRenderingContext2D, cfg: CardConfig, active: DragTarget, participant: Participant,
) {
  const b = elementBox(cfg, active, ctx, participant);
  const pad = 4;
  const bx = b.x - pad, by = b.y - pad, bw = b.w + pad * 2, bh = b.h + pad * 2;

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.setLineDash([]);

  ctx.fillStyle = '#2563eb';
  const hs = 5;
  const pts = handlePoints({ x: bx, y: by, w: bw, h: bh });
  for (const k of HANDLE_ORDER) {
    ctx.fillRect(pts[k].x - hs / 2, pts[k].y - hs / 2, hs, hs);
  }
  ctx.restore();
}

/** Deteksi pegangan resize (8 arah) pada bounding box. */
function hitResizeHandle(
  px: number, py: number, b: { x: number; y: number; w: number; h: number },
): ResizeHandle | null {
  const t = 10;
  const pts = handlePoints({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 });
  for (const k of HANDLE_ORDER) {
    if (Math.abs(px - pts[k].x) <= t && Math.abs(py - pts[k].y) <= t) return k;
  }
  return null;
}

/** Kursor yang sesuai untuk tiap arah pegangan resize. */
const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
};

/** Gambar satu elemen teks di dalam kotaknya (wrap + padding + line-height). */
function drawTextField(
  ctx: CanvasRenderingContext2D, t: TextFieldConfig, text: string,
) {
  const layout = computeLayout(t, text, ctx);
  const { fontSize, lines } = layout;
  ctx.font = `${t.fontWeight} ${fontSize}px ${t.fontFamily}`;
  ctx.fillStyle = t.color;
  ctx.textAlign = t.align;

  const clipToBox = t.height > 0;
  if (clipToBox) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(t.x, t.y, t.width, t.height);
    ctx.clip();
  }

  const linePx = fontSize * layout.lineHeight;
  const firstBaseline = t.y + t.padding + fontSize * 0.8;
  lines.forEach((line, i) => {
    let x = t.x + t.padding;
    if (t.align === 'center') x = t.x + t.width / 2;
    else if (t.align === 'right') x = t.x + t.width - t.padding;
    ctx.fillText(line, x, firstBaseline + i * linePx);
  });

  if (clipToBox) ctx.restore();
}

const renderCard = async (
  canvas: HTMLCanvasElement, template: HTMLImageElement,
  participant: Participant, config: CardConfig,
  opts?: { active?: DragTarget | null },
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = template.naturalWidth || 640;
  canvas.height = template.naturalHeight || 400;

  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  for (const t of config.textFields) {
    drawTextField(ctx, t, fieldValue(t.field, participant));
  }

  try {
    const qrDataUrl = await qrToDataUrlCached(qrContent(participant), config.qr.size);
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = qrDataUrl; });
    ctx.drawImage(img, config.qr.x, config.qr.y, config.qr.size, config.qr.size);
  } catch (e) {
    console.warn('QR generation error for:', participant.id, e);
  }

  if (opts?.active) {
    drawSelectionBox(ctx, config, opts.active, participant);
  }
};

/** Garis potong (crop marks) berbentuk tanda silang kecil di keempat sudut kartu. */
function drawCropMarks(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  const L = 2.5;
  pdf.setDrawColor(110, 110, 110);
  pdf.setLineWidth(0.2);
  const corner = (cx: number, cy: number) => {
    pdf.line(cx, cy - L, cx, cy + L);
    pdf.line(cx - L, cy, cx + L, cy);
  };
  corner(x, y);
  corner(x + w, y);
  corner(x, y + h);
  corner(x + w, y + h);
}

// --- UI Helpers ---

interface NumberRowProps {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; unit?: string;
}
const NumberRow: React.FC<NumberRowProps> = ({ label, value, min, max, onChange, unit = '' }) => (
  <div className="flex items-center gap-3">
    <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">{label}</label>
    <input type="number" value={value} min={min} max={max}
      onChange={e => onChange(clamp(Number(e.target.value) || 0, min, max))}
      className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" />
    <span className="text-[11px] font-mono text-slate-400 w-10 text-right">{unit}</span>
  </div>
);

interface SelectRowProps {
  label: string; value: string; options: { label: string; value: string }[];
  onChange: (v: string) => void;
}
const SelectRow: React.FC<SelectRowProps> = ({ label, value, options, onChange }) => (
  <div className="flex items-center gap-3">
    <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-200 outline-none focus:border-blue-500 cursor-pointer">
      {options.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
    </select>
  </div>
);

export const AdminIdCard: React.FC = () => {
  const { participants } = useApp();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [templateImg, setTemplateImg] = useState<HTMLImageElement | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('name');
  const [toast, setToast] = useState<string | null>(null);

  // Drag & selection state (langsung klik elemen di canvas)
  const [activeTarget, setActiveTarget] = useState<DragTarget | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DragTarget | null>(null);
  const [isDragMoving, setIsDragMoving] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeHandle | null>(null);
  const [hoverHandle, setHoverHandle] = useState<ResizeHandle | null>(null);
  const resizeStart = useRef<{
    handle: ResizeHandle;
    startX: number; startY: number; startW: number; startH: number;
  } | null>(null);

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

  // PDF options
  const [cropMarks, setCropMarks] = useState(true);

  // Layout preview modal
  const [showLayoutPreview, setShowLayoutPreview] = useState(false);

  const gridParams: GridLayoutParams = { paperW, paperH, cardW, cardH, marginTop, marginBottom, marginLeft, marginRight, gap };
  const layout = computeGrid(gridParams);
  const selectedParticipants = participants.filter(p => selectedIds.has(p.id));

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
    renderCard(previewCanvasRef.current, templateImg, previewParticipant, config, { active: activeTarget });
  }, [templateImg, previewParticipant, config, activeTarget]);

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
    e.preventDefault(); setIsDraggingFile(false);
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

  // --- Seleksi elemen (sync dua arah canvas ⇄ panel) ---
  const selectTarget = (t: DragTarget | null) => {
    setActiveTarget(t);
    setHoverTarget(t);
    if (t) setOpenSection(t);
  };

  const updateXY = (t: DragTarget, x: number, y: number) => {
    setConfig(c => {
      if (t === QR_TARGET) return { ...c, qr: { ...c.qr, x, y } };
      return { ...c, textFields: c.textFields.map(f => f.id === t ? { ...f, x, y } : f) };
    });
  };

  const updateActiveXY = (axis: 'x' | 'y', value: number) => {
    if (!activeTarget) return;
    setConfig(c => {
      if (activeTarget === QR_TARGET) return { ...c, qr: { ...c.qr, [axis]: value } };
      return { ...c, textFields: c.textFields.map(f => f.id === activeTarget ? { ...f, [axis]: value } : f) };
    });
  };

  /** Terapkan resize ke elemen teks berdasarkan pegangan & delta pointer. */
  const applyTextResize = (handle: ResizeHandle, dx: number, dy: number) => {
    if (!activeTarget || activeTarget === QR_TARGET || !resizeStart.current) return;
    const rs = resizeStart.current;
    let w = rs.startW, h = rs.startH, x = rs.startX, y = rs.startY;
    if (handle.includes('e')) w = rs.startW + dx;
    if (handle.includes('w')) { w = rs.startW - dx; x = rs.startX + dx; }
    if (handle.includes('s')) h = rs.startH + dy;
    if (handle.includes('n')) { h = rs.startH - dy; y = rs.startY + dy; }
    w = clamp(w, 40, 2000);
    h = clamp(h, 24, 2000);
    setConfig(c => ({
      ...c,
      textFields: c.textFields.map(f => f.id === activeTarget ? {
        ...f,
        x: Math.round(x), y: Math.round(y),
        width: Math.round(w), height: Math.round(h),
      } : f),
    }));
  };

  /** Terapkan resize ke QR (ukuran bujur sangkar, jangkar di tengah). */
  const applyQrResize = (dx: number, dy: number) => {
    if (!activeTarget || activeTarget !== QR_TARGET || !resizeStart.current) return;
    const rs = resizeStart.current;
    // Perubahan ukuran diambil dari diagonal rata-rata agar tetap persegi.
    const avg = (Math.abs(dx) + Math.abs(dy)) / 2;
    const size = clamp(rs.startW + avg, 40, 600);
    setConfig(c => ({
      ...c,
      qr: {
        ...c.qr,
        x: Math.round(rs.startX - (size - rs.startW) / 2),
        y: Math.round(rs.startY - (size - rs.startH) / 2),
        size: Math.round(size),
      },
    }));
  };

  const addTextField = () => {
    const newId = `tf-${Date.now()}`;
    setConfig(c => ({
      ...c,
      textFields: [...c.textFields, {
        id: newId, field: 'name', x: 50, y: 180, width: 360, height: 0, fontSize: 16, color: '#1e293b',
        fontWeight: 'normal', align: 'left', fontFamily: DEFAULT_FONT_FAMILY,
        lineHeight: 1.25, padding: 8, maxLines: 0, autofit: false,
      }],
    }));
    setOpenSection(newId);
  };

  const removeTextField = (id: string) => {
    setConfig(c => ({ ...c, textFields: c.textFields.filter(f => f.id !== id) }));
    if (activeTarget === id) setActiveTarget(null);
    if (openSection === id) setOpenSection(null);
  };

  const downloadSingle = async (p: Participant) => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    const canvas = document.createElement('canvas');
    await renderCard(canvas, templateImg, p, config);
    canvas.toBlob(blob => { if (blob) saveAs(blob, `IDCard_${p.id}.png`); }, 'image/png');
  };

  // --- Generate PDF siap cetak (multi-halaman, menggantikan .ZIP) ---
  const generatePdf = async () => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    if (selectedParticipants.length === 0) { showToast('Pilih minimal 1 peserta!'); return; }
    setIsGenerating(true);
    try {
      const totalPages = pageCountFor(selectedParticipants.length, layout.perSheet);
      const orientation: 'portrait' | 'landscape' = paperW >= paperH ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [paperW, paperH] });

      // Render semua kartu sekali, lalu susun ke halaman-halaman PDF.
      const images: string[] = [];
      for (const p of selectedParticipants) {
        const canvas = document.createElement('canvas');
        await renderCard(canvas, templateImg, p, config);
        images.push(canvas.toDataURL('image/png'));
      }

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage([paperW, paperH], orientation);
        const start = page * layout.perSheet;
        const end = Math.min(start + layout.perSheet, images.length);
        for (let i = start; i < end; i++) {
          const pos = slotPosition(i - start, gridParams, layout);
          pdf.addImage(images[i], 'PNG', pos.xMM, pos.yMM, cardW, cardH, undefined, 'FAST');
          if (cropMarks) drawCropMarks(pdf, pos.xMM, pos.yMM, cardW, cardH);
        }
      }

      pdf.save(`IDCards_CAI_${selectedParticipants.length}_peserta.pdf`);
      showToast(`✅ PDF siap cetak: ${selectedParticipants.length} ID card — ${totalPages} halaman ${paperPreset}`);
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Gagal membuat PDF. Coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Canvas mouse handlers: klik & seret langsung ---
  const canvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
      canvas,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !templateImg || !previewParticipant) return;
    const c = canvasCoords(e);
    const ctx = c?.canvas.getContext('2d');
    if (!c || !ctx) return;

    // 1) Prioritaskan handle resize pada elemen yang sedang aktif.
    if (activeTarget && findField(config, activeTarget)) {
      const b = elementBox(config, activeTarget, ctx, previewParticipant);
      const handle = hitResizeHandle(c.x, c.y, b);
      if (handle) {
        e.preventDefault();
        selectTarget(activeTarget);
        setResizeMode(handle);
        resizeStart.current = { handle, startX: b.x, startY: b.y, startW: b.w, startH: b.h };
        return;
      }
    }

    // 2) Kalau bukan handle, lakukan drag/pilih elemen.
    const hit = hitTest(c.x, c.y, config, ctx, previewParticipant);
    if (hit) {
      e.preventDefault();
      selectTarget(hit);
      setIsDragMoving(true);
      const el = hit === QR_TARGET ? config.qr : findField(config, hit);
      if (!el) return;
      dragStart.current = { x: c.x - el.x, y: c.y - el.y };
    } else {
      setActiveTarget(null);
      setHoverHandle(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!templateImg) return;
    const c = canvasCoords(e);
    if (!c) return;

    // Mode resize (8 pegangan) — lebar/tinggi diubah real-time.
    if (resizeMode && activeTarget && resizeStart.current) {
      const rs = resizeStart.current;
      const dx = c.x - rs.startX;
      const dy = c.y - rs.startY;
      if (activeTarget === QR_TARGET) applyQrResize(dx, dy);
      else applyTextResize(rs.handle, dx, dy);
      return;
    }

    if (isDragMoving && activeTarget && dragStart.current) {
      const newX = clamp(c.x - dragStart.current.x, 0, c.canvas.width);
      const newY = clamp(c.y - dragStart.current.y, 0, c.canvas.height);
      updateXY(activeTarget, newX, newY);
    } else if (previewParticipant) {
      const ctx = c.canvas.getContext('2d');
      if (!ctx) return;
      const hover = hitTest(c.x, c.y, config, ctx, previewParticipant);
      setHoverTarget(hover);
      if (hover && findField(config, hover)) {
        const b = elementBox(config, hover, ctx, previewParticipant);
        setHoverHandle(hitResizeHandle(c.x, c.y, b));
      } else {
        setHoverHandle(null);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragMoving(false);
    dragStart.current = null;
    setResizeMode(null);
    resizeStart.current = null;
  };

  const SectionHeader: React.FC<{ title: string; icon: React.ElementType; section: DragTarget; onRemove?: () => void }> = ({ title, icon: Icon, section, onRemove }) => {
    const isOpen = openSection === section;
    const isActive = activeTarget === section;
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => { setOpenSection(isOpen ? null : section); if (!isOpen) setActiveTarget(section); }}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} /> {title}
          </div>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
        </button>
        {onRemove && (
          <button onClick={onRemove} title={`Hapus elemen ${title}`}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={() => selectTarget(isActive ? null : section)} title={isActive ? 'Batalkan seleksi' : `Pilih ${title} di canvas`}
          className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${isActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
          {isActive ? '✓' : 'Pilih'}
        </button>
      </div>
    );
  };

  const TextConfigPanel: React.FC<{ cfg: TextFieldConfig; update: (k: keyof TextFieldConfig, v: unknown) => void }> = ({ cfg, update }) => (
    <div className="space-y-3 px-1 py-3">
      <SelectRow label="Data" value={cfg.field} options={FIELD_OPTIONS.map(o => ({ label: o.label, value: o.key }))}
        onChange={v => update('field', v as ParticipantFieldKey)} />
      <SelectRow label="Jenis Font" value={cfg.fontFamily} options={FONT_OPTIONS} onChange={v => update('fontFamily', v)} />
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">Rata Teks</label>
        <div className="flex flex-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {([
            { key: 'left' as const, icon: AlignLeft, title: 'Rata kiri' },
            { key: 'center' as const, icon: AlignCenter, title: 'Rata tengah' },
            { key: 'right' as const, icon: AlignRight, title: 'Rata kanan' },
          ]).map(({ key, icon: Icon, title }) => (
            <button key={key} type="button" title={title} onClick={() => update('align', key)}
              className={`flex-1 py-1.5 flex items-center justify-center transition-colors cursor-pointer ${cfg.align === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[10px] font-semibold text-slate-500">X (px)</label>
          <input type="number" value={Math.round(cfg.x)} min={0} max={1200}
            onChange={e => update('x', clamp(Number(e.target.value) || 0, 0, 1200))}
            className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
        <div><label className="text-[10px] font-semibold text-slate-500">Y (px)</label>
          <input type="number" value={Math.round(cfg.y)} min={0} max={1200}
            onChange={e => update('y', clamp(Number(e.target.value) || 0, 0, 1200))}
            className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
      </div>
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-[10px] leading-relaxed text-blue-300">
        Ukuran kotak diubah langsung dengan <b>menarik 8 titik di canvas</b> (W: {Math.round(cfg.width)}px {cfg.height > 0 ? `· H: ${Math.round(cfg.height)}px` : '· H: otomatis'}).
      </div>
      <div><label className="text-[10px] font-semibold text-slate-500">Font Size (px)</label>
        <input type="number" value={cfg.fontSize} min={4}
          onChange={e => update('fontSize', clamp(Number(e.target.value) || 4, 4, 1000))}
          className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[10px] font-semibold text-slate-500">Padding (px)</label>
          <input type="number" value={cfg.padding} min={0}
            onChange={e => update('padding', clamp(Number(e.target.value) || 0, 0, 60))}
            className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
        <div><label className="text-[10px] font-semibold text-slate-500">Line Height</label>
          <input type="number" value={cfg.lineHeight} min={0.8} step={0.05}
            onChange={e => update('lineHeight', clamp(Number(e.target.value) || 1.25, 0.8, 3))}
            className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <div><label className="text-[10px] font-semibold text-slate-500">Maks Baris (0 = tanpa batas)</label>
          <input type="number" value={cfg.maxLines} min={0}
            onChange={e => update('maxLines', Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 cursor-pointer select-none pb-1.5">
          <input type="checkbox" checked={cfg.autofit} onChange={e => update('autofit', e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer" />
          Autofit Teks
        </label>
      </div>
      {cfg.autofit && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[10px] leading-relaxed text-emerald-300">
          Autofit aktif: jika teks melebihi <b>{cfg.maxLines || 'batas'}</b> baris{cfg.height > 0 ? ` / tinggi kotak ${Math.round(cfg.height)}px` : ''}, ukuran font dikurangi otomatis agar teks tetap muat dalam kotak.
        </div>
      )}
      {cfg.height > 0 && (
        <button type="button" onClick={() => update('height', 0)}
          className="w-full px-3 py-2 rounded-xl border border-dashed border-slate-600 text-[11px] font-bold text-slate-400 hover:text-white hover:border-blue-500/60 hover:bg-blue-500/10 transition-colors cursor-pointer">
          ↺ Kembalikan Tinggi Otomatis (ikuti isi teks)
        </button>
      )}
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

  const activeCfg = activeTarget === QR_TARGET ? config.qr
    : activeTarget ? findField(config, activeTarget) ?? null : null;

  const activeLabel = activeCfg && activeTarget !== QR_TARGET
    ? fieldLabel((activeCfg as TextFieldConfig).field)
    : activeTarget === QR_TARGET ? 'QR Code' : '';

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
            Upload template, geser teks/QR langsung di preview, lalu unduh PDF siap cetak dengan tata letak kertas otomatis.
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
                onDragOver={e => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)} onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20'}`}>
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
              {/* Petunjuk + quick XY sync */}
              <div className="flex items-start gap-2 px-1 text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                <MousePointerClick className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span>Klik & seret langsung elemen pada preview di sebelah kanan, atau atur posisi X/Y di panel ini.</span>
              </div>

              {activeTarget && activeCfg && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-300">
                        Elemen aktif: {activeLabel}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">({Math.round(activeCfg.x)}, {Math.round(activeCfg.y)})</span>
                    </div>
                    <NumberRow label="X (px)" value={Math.round(activeCfg.x)} min={0} max={1200} onChange={v => updateActiveXY('x', v)} />
                    <NumberRow label="Y (px)" value={Math.round(activeCfg.y)} min={0} max={1200} onChange={v => updateActiveXY('y', v)} />
                  </div>
                </motion.div>
              )}

              {config.textFields.map(tf => (
                <div key={tf.id}>
                  <SectionHeader title={fieldLabel(tf.field)} icon={Type} section={tf.id} onRemove={() => removeTextField(tf.id)} />
                  <AnimatePresence>{openSection === tf.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <TextConfigPanel cfg={tf} update={(k, v) => setConfig(c => ({
                        ...c, textFields: c.textFields.map(f => f.id === tf.id ? { ...f, [k]: v } : f),
                      }))} />
                    </motion.div>
                  )}</AnimatePresence>
                </div>
              ))}

              <button onClick={addTextField}
                className="w-full px-3 py-2 rounded-xl border border-dashed border-slate-600 text-xs font-bold text-slate-400 hover:text-white hover:border-blue-500/60 hover:bg-blue-500/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Tambah Elemen Teks
              </button>

              <SectionHeader title="QR Code" icon={Sliders} section="qr" />
              <AnimatePresence>{openSection === 'qr' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-3 px-1 py-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-emerald-300">
                      QR berisi <b>Serial RFID</b> peserta, jadi saat di-scan saat absen langsung terdeteksi sebagai RFID
                      (pengganti kartu RFID). Jika RFID belum dipasang, QR otomatis berisi <b>ID Peserta</b> sebagai cadangan.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] font-semibold text-slate-500">X (px)</label>
                        <input type="number" value={Math.round(config.qr.x)} min={0} max={1200}
                          onChange={e => setConfig(c => ({ ...c, qr: { ...c.qr, x: clamp(Number(e.target.value) || 0, 0, 1200) } }))}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
                      <div><label className="text-[10px] font-semibold text-slate-500">Y (px)</label>
                        <input type="number" value={Math.round(config.qr.y)} min={0} max={1200}
                          onChange={e => setConfig(c => ({ ...c, qr: { ...c.qr, y: clamp(Number(e.target.value) || 0, 0, 1200) } }))}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
                    </div>
                    <div><label className="text-[10px] font-semibold text-slate-500">Ukuran (px)</label>
                      <input type="number" value={config.qr.size} min={40} max={400}
                        onChange={e => setConfig(c => ({ ...c, qr: { ...c.qr, size: clamp(Number(e.target.value) || 40, 40, 400) } }))}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500" /></div>
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
                    <input type="number" value={paperW} onChange={e => setPaperW(Math.max(50, Number(e.target.value) || 0))} className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                  <div><label className="text-[10px] font-semibold text-slate-400">Tinggi (mm)</label>
                    <input type="number" value={paperH} onChange={e => setPaperH(Math.max(50, Number(e.target.value) || 0))} className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-slate-400">Lebar ID Card (mm)</label>
                  <input type="number" value={cardW} onChange={e => setCardW(Math.max(20, Number(e.target.value) || 0))} min={20} max={200}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Tinggi ID Card (mm)</label>
                  <input type="number" value={cardH} onChange={e => setCardH(Math.max(20, Number(e.target.value) || 0))} min={20} max={200}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Atas (mm)</label>
                  <input type="number" value={marginTop} onChange={e => setMarginTop(Math.max(0, Number(e.target.value) || 0))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Bawah (mm)</label>
                  <input type="number" value={marginBottom} onChange={e => setMarginBottom(Math.max(0, Number(e.target.value) || 0))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Kiri (mm)</label>
                  <input type="number" value={marginLeft} onChange={e => setMarginLeft(Math.max(0, Number(e.target.value) || 0))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-slate-400">Margin Kanan (mm)</label>
                  <input type="number" value={marginRight} onChange={e => setMarginRight(Math.max(0, Number(e.target.value) || 0))} min={0} max={50}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>
              </div>
              <div><label className="text-[10px] font-semibold text-slate-400">Jarak Antar ID Card (mm)</label>
                <input type="number" value={gap} onChange={e => setGap(Math.max(0, Number(e.target.value) || 0))} min={0} max={30}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none" /></div>

              {/* Kalkulasi otomatis — berapa kartu per lembar */}
              <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                <div className="flex items-center gap-2 text-blue-700 font-bold">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  Satu lembar {paperPreset} muat <span className="text-sm font-black">{layout.perSheet}</span> ID card
                </div>
                <div className="mt-1 text-[10px] text-slate-500 font-mono">
                  {layout.cols} kolom × {layout.rows} baris • {cardW}×{cardH} mm • margin {marginTop}/{marginBottom}/{marginLeft}/{marginRight} mm • gap {gap} mm
                </div>
              </div>
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
                <h3 className="text-sm font-bold text-slate-900">4. Preview (WYSIWYG)</h3>
                {activeTarget && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                    {activeLabel} dipilih — geser untuk memindah
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
                <>
                  <div className="overflow-auto rounded-xl border border-slate-100 bg-slate-50">
                    <canvas ref={previewCanvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className="max-w-full h-auto block mx-auto rounded-xl shadow touch-none"
                      style={{
                        imageRendering: 'auto',
                        cursor: isDragMoving ? 'grabbing'
                          : resizeMode ? HANDLE_CURSOR[resizeMode]
                          : hoverHandle ? HANDLE_CURSOR[hoverHandle]
                          : hoverTarget ? 'grab' : 'default',
                      }} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                    <MousePointerClick className="h-3 w-3 text-blue-500" />
                    Geser di dalam kotak untuk memindah; tarik 8 titik di sekeliling kotak untuk mengubah lebar & tinggi (teks panjang otomatis wrap ke bawah).
                  </div>
                  {previewParticipant && (
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      {previewParticipant.rfidCardId ? (
                        <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">
                          QR = RFID: {previewParticipant.rfidCardId}
                        </span>
                      ) : (
                        <span className="font-mono text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg font-bold">
                          QR = ID: {previewParticipant.id} (RFID belum dipasang)
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
              {templateImg && previewParticipant && (
                <div className="mt-3 flex justify-end">
                  <button onClick={() => downloadSingle(previewParticipant)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer">
                    <Download className="h-3.5 w-3.5" /> Download Preview (PNG)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Layout Cetak Preview */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">5. Preview Layout Cetak</h3>
              </div>
              <button onClick={() => setShowLayoutPreview(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer">
                <LayoutGrid className="h-3.5 w-3.5" /> Buka Preview Layout
              </button>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-100">
                  {layout.perSheet} kartu / lembar
                </span>
                <span className="text-slate-500 font-semibold">
                  {layout.cols}×{layout.rows} • {pageCountFor(selectedParticipants.length, layout.perSheet)} halaman untuk {selectedParticipants.length} peserta
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Simulasi posisi kartu dalam 1 lembar kertas sebelum di-download.
              </p>
            </div>
          </div>

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
                        {p.rfidCardId ? (
                          <span className="font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold" title="QR akan berisi Serial RFID ini">RFID: {p.rfidCardId}</span>
                        ) : (
                          <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold" title="RFID belum dipasang, QR otomatis berisi ID Peserta">ID: {p.id}</span>
                        )}
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
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-semibold">
                  <span className="font-bold text-slate-800">{selectedIds.size}</span> peserta dipilih dari {participants.length}
                  {selectedIds.size > 0 && (
                    <span className="ml-1">→ {pageCountFor(selectedIds.size, layout.perSheet)} halaman {paperPreset}</span>
                  )}
                </div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={cropMarks} onChange={e => setCropMarks(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer" />
                  <Scissors className="h-3.5 w-3.5 text-slate-400" />
                  Tampilkan Crop Marks / Garis Potong
                </label>
              </div>
              <button onClick={generatePdf} disabled={!templateImg || selectedIds.size === 0 || isGenerating}
                className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-700/15 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed">
                {isGenerating
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Menyusun PDF...</>
                  : <><FileDown className="h-4 w-4" /> Download PDF Siap Cetak ({selectedIds.size} ID card)</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PaperLayoutPreview
        open={showLayoutPreview}
        onClose={() => setShowLayoutPreview(false)}
        paperLabel={paperPreset}
        paperW={paperW}
        paperH={paperH}
        params={gridParams}
        participants={selectedParticipants}
        templateUrl={templateUrl}
      />
    </div>
  );
};
