import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Participant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import JsBarcode from 'jsbarcode';
import {
  CreditCard,
  Upload,
  Download,
  Settings,
  Eye,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  RefreshCw,
  PackageOpen,
  Type,
  AlignLeft,
  Sliders,
} from 'lucide-react';

// --- Types ---
interface TextConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  align: CanvasTextAlign;
}

interface BarcodeConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  showText: boolean;
}

interface CardConfig {
  name: TextConfig;
  group: TextConfig;
  origin: TextConfig;
  barcode: BarcodeConfig;
}

const DEFAULT_CONFIG: CardConfig = {
  name: { x: 50, y: 180, fontSize: 22, color: '#1e293b', fontWeight: 'bold', align: 'left' },
  group: { x: 50, y: 210, fontSize: 13, color: '#475569', fontWeight: 'normal', align: 'left' },
  origin: { x: 50, y: 230, fontSize: 13, color: '#475569', fontWeight: 'normal', align: 'left' },
  barcode: { x: 50, y: 260, width: 200, height: 60, showText: true },
};

// --- Helper: render one card to canvas ---
const renderCard = (
  canvas: HTMLCanvasElement,
  template: HTMLImageElement,
  participant: Participant,
  config: CardConfig,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = template.naturalWidth || 640;
  canvas.height = template.naturalHeight || 400;

  // Draw template background
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  // Draw Name
  ctx.font = `${config.name.fontWeight} ${config.name.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = config.name.color;
  ctx.textAlign = config.name.align;
  ctx.fillText(participant.name, config.name.x, config.name.y);

  // Draw Group
  ctx.font = `${config.group.fontWeight} ${config.group.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = config.group.color;
  ctx.textAlign = config.group.align;
  ctx.fillText(participant.group, config.group.x, config.group.y);

  // Draw Origin
  ctx.font = `${config.origin.fontWeight} ${config.origin.fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = config.origin.color;
  ctx.textAlign = config.origin.align;
  ctx.fillText(`Asal: ${participant.origin}`, config.origin.x, config.origin.y);

  // Generate barcode onto a temporary canvas
  try {
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, participant.id, {
      format: 'CODE128',
      width: 2,
      height: config.barcode.height,
      displayValue: config.barcode.showText,
      fontSize: 12,
      margin: 6,
      background: 'transparent',
      lineColor: '#1e293b',
    });
    ctx.drawImage(barcodeCanvas, config.barcode.x, config.barcode.y, config.barcode.width, config.barcode.height + (config.barcode.showText ? 20 : 0));
  } catch (e) {
    console.warn('Barcode generation error for:', participant.id, e);
  }
};

// --- Slider Row UI helper ---
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, onChange, unit = '' }) => (
  <div className="flex items-center gap-3">
    <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="flex-1 h-1 accent-blue-500"
    />
    <span className="text-[11px] font-mono text-slate-300 w-10 text-right">{value}{unit}</span>
  </div>
);

// --- Main Page Component ---
export const AdminIdCard: React.FC = () => {
  const { participants } = useApp();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [templateImg, setTemplateImg] = useState<HTMLImageElement | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [openSection, setOpenSection] = useState<'name' | 'group' | 'origin' | 'barcode' | null>('name');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (participants.length > 0 && !previewParticipant) {
      setPreviewParticipant(participants[0]);
    }
  }, [participants, previewParticipant]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Re-render preview whenever template or config or preview participant changes
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
    img.onload = () => {
      setTemplateImg(img);
      setTemplateUrl(url);
    };
    img.src = url;
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadTemplate(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) loadTemplate(e.dataTransfer.files[0]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === participants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participants.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const downloadSingle = (participant: Participant) => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    const canvas = document.createElement('canvas');
    renderCard(canvas, templateImg, participant, config);
    canvas.toBlob(blob => {
      if (blob) saveAs(blob, `IDCard_${participant.id}.png`);
    }, 'image/png');
  };

  const downloadSelected = async () => {
    if (!templateImg) { showToast('Upload template terlebih dahulu!'); return; }
    const targets = participants.filter(p => selectedIds.has(p.id));
    if (targets.length === 0) { showToast('Pilih minimal 1 peserta!'); return; }
    setIsGenerating(true);

    const zip = new JSZip();
    for (const p of targets) {
      const canvas = document.createElement('canvas');
      renderCard(canvas, templateImg, p, config);
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));
      zip.file(`IDCard_${p.id}.png`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `IDCards_CAI_${targets.length}_peserta.zip`);
    setIsGenerating(false);
    showToast(`✅ ${targets.length} ID card berhasil di-generate!`);
  };

  const updateNameCfg = (key: keyof TextConfig, val: unknown) =>
    setConfig(c => ({ ...c, name: { ...c.name, [key]: val } }));
  const updateGroupCfg = (key: keyof TextConfig, val: unknown) =>
    setConfig(c => ({ ...c, group: { ...c.group, [key]: val } }));
  const updateOriginCfg = (key: keyof TextConfig, val: unknown) =>
    setConfig(c => ({ ...c, origin: { ...c.origin, [key]: val } }));
  const updateBarcodeCfg = (key: keyof BarcodeConfig, val: unknown) =>
    setConfig(c => ({ ...c, barcode: { ...c.barcode, [key]: val } }));

  const SectionHeader: React.FC<{ title: string; icon: React.ElementType; section: typeof openSection }> = ({ title, icon: Icon, section }) => (
    <button
      onClick={() => setOpenSection(openSection === section ? null : section)}
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
        <Icon className="h-3.5 w-3.5 text-blue-400" />
        {title}
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
        <button
          type="button"
          onClick={() => update('fontWeight', cfg.fontWeight === 'bold' ? 'normal' : 'bold')}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors border ${cfg.fontWeight === 'bold' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
        >
          {cfg.fontWeight === 'bold' ? 'Bold ON' : 'Bold OFF'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Cetak ID Card Kustom
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload desain template, atur posisi nama & barcode, lalu generate ID card untuk semua peserta.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setConfig(DEFAULT_CONFIG)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Konfigurasi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* LEFT: Config Panel */}
        <div className="xl:col-span-4 space-y-4">

          {/* Upload Template */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">1. Upload Template ID Card</h3>
            </div>
            <div className="p-5">
              <label
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20'}`}
              >
                <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileInput} />
                {templateUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={templateUrl} alt="template" className="h-20 w-auto object-contain rounded-lg shadow" />
                    <span className="text-[11px] text-blue-600 font-semibold">Klik untuk ganti template</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload className="h-8 w-8" />
                    <span className="text-xs font-semibold">Drag & drop atau klik untuk upload</span>
                    <span className="text-[10px]">PNG, JPG — Ukuran ID card yang direkomendasikan: 640×400 px</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Element Config Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">2. Atur Posisi Elemen</h3>
            </div>
            <div className="p-4 space-y-3">

              {/* Name */}
              <SectionHeader title="Nama Peserta" icon={Type} section="name" />
              <AnimatePresence>
                {openSection === 'name' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <TextConfigPanel cfg={config.name} update={updateNameCfg} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Group */}
              <SectionHeader title="Kelompok" icon={AlignLeft} section="group" />
              <AnimatePresence>
                {openSection === 'group' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <TextConfigPanel cfg={config.group} update={updateGroupCfg} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Origin */}
              <SectionHeader title="Asal Daerah" icon={AlignLeft} section="origin" />
              <AnimatePresence>
                {openSection === 'origin' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <TextConfigPanel cfg={config.origin} update={updateOriginCfg} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Barcode */}
              <SectionHeader title="Barcode (Code128)" icon={Sliders} section="barcode" />
              <AnimatePresence>
                {openSection === 'barcode' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-3 px-1 py-3">
                      <SliderRow label="X (kiri)" value={config.barcode.x} min={0} max={700} onChange={v => updateBarcodeCfg('x', v)} unit="px" />
                      <SliderRow label="Y (atas)" value={config.barcode.y} min={0} max={700} onChange={v => updateBarcodeCfg('y', v)} unit="px" />
                      <SliderRow label="Lebar" value={config.barcode.width} min={80} max={600} onChange={v => updateBarcodeCfg('width', v)} unit="px" />
                      <SliderRow label="Tinggi" value={config.barcode.height} min={30} max={200} onChange={v => updateBarcodeCfg('height', v)} unit="px" />
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-semibold text-slate-400 w-20 shrink-0">Tampilkan ID</label>
                        <button
                          type="button"
                          onClick={() => updateBarcodeCfg('showText', !config.barcode.showText)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors border ${config.barcode.showText ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
                        >
                          {config.barcode.showText ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview + Download */}
        <div className="xl:col-span-8 space-y-5">

          {/* Preview Canvas */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">3. Preview Real-Time</h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-semibold">Preview peserta:</label>
                <select
                  value={previewParticipant?.id || ''}
                  onChange={e => setPreviewParticipant(participants.find(p => p.id === e.target.value) || null)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-semibold"
                >
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
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
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full h-auto block mx-auto rounded-xl shadow"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              )}
              {templateImg && previewParticipant && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => downloadSingle(previewParticipant)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Preview Ini
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Participant Selection */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">4. Pilih Peserta untuk Generate</h3>
              </div>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="h-3.5 w-3.5" />
                {selectedIds.size === participants.length ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {participants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Belum ada data peserta.</div>
              ) : (
                participants.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{p.id}</span>
                        <span>•</span>
                        <span>{p.group}</span>
                        <span>•</span>
                        <span>{p.origin}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); downloadSingle(p); }}
                      disabled={!templateImg}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all disabled:opacity-30 cursor-pointer"
                      title="Download ID card ini"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </label>
                ))
              )}
            </div>

            {/* Bulk Download Footer */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                <span className="font-bold text-slate-800">{selectedIds.size}</span> peserta dipilih dari {participants.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadSelected}
                  disabled={!templateImg || selectedIds.size === 0 || isGenerating}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-blue-700/15 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PackageOpen className="h-4 w-4" />
                      Download {selectedIds.size} ID Card (.ZIP)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
