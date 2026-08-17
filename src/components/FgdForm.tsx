import React, { useState, useRef, useCallback } from 'react';
import { FgdMinute } from '../types';
import { Bold, List, ListOrdered } from 'lucide-react';

type FgdFormData = Omit<FgdMinute, 'id' | 'createdAt' | 'updatedAt' | 'groupNumber'>;

const REQUIRED_FIELDS: (keyof FgdFormData)[] = [
  'usulanPermasalahan',
  'problem',
  'penyebab',
  'actionPlanBidangPpg',
  'actionPlanDeskripsi',
  'actionPlanNamaKegiatan',
  'actionPlanPeserta',
  'actionPlanWaktu',
  'actionPlanDana',
];

const FIELD_LABELS: Record<string, string> = {
  usulanPermasalahan: 'Usulan Permasalahan',
  problem: 'Problem',
  penyebab: 'Penyebab',
  solusi: 'Solusi',
  actionPlanBidangPpg: 'Bidang PPG',
  actionPlanDeskripsi: 'Deskripsi',
  actionPlanNamaKegiatan: 'Nama Kegiatan',
  actionPlanPeserta: 'Peserta',
  actionPlanWaktu: 'Waktu',
  actionPlanDana: 'Dana',
};

interface FgdFormProps {
  groupNumber: number;
  initialData: FgdMinute | null;
  /** Label sesi tampilan, mis. "Sesi 1: tema" (hanya ditampilkan, tidak bisa diubah di sini). */
  sessionLabel?: string;
  /** Nama sesi default saat initialData null (mis. "Sesi 3"). */
  sessionName?: string;
  onSubmit: (data: FgdFormData) => Promise<void>;
  disabled?: boolean;
}

const emptyForm: FgdFormData = {
  sessionName: '',
  authorName: '',
  usulanPermasalahan: '',
  problem: '',
  penyebab: '',
  solusi: '',
  actionPlanBidangPpg: '',
  actionPlanDeskripsi: '',
  actionPlanNamaKegiatan: '',
  actionPlanPeserta: '',
  actionPlanWaktu: '',
  actionPlanDana: '',
  peranKeimaman: '',
  peranPengurus: '',
  peranOrangTua: '',
  peranMubaligh: '',
  peranAhliPendidik: '',
};

function insertFormat(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const selected = val.substring(start, end);
  const replacement = before + selected + after;
  const newVal = val.substring(0, start) + replacement + val.substring(end);
  textarea.value = newVal;
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function insertBullet(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const lines = val.substring(start, end).split('\n');
  const prefixed = lines.map(l => l.trim() ? `- ${l}` : l).join('\n');
  const newVal = val.substring(0, start) + prefixed + val.substring(end);
  textarea.value = newVal;
  textarea.selectionStart = start;
  textarea.selectionEnd = start + prefixed.length;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function insertNumbered(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const lines = val.substring(start, end).split('\n');
  const prefixed = lines.map((l, i) => l.trim() ? `${i + 1}. ${l}` : l).join('\n');
  const newVal = val.substring(0, start) + prefixed + val.substring(end);
  textarea.value = newVal;
  textarea.selectionStart = start;
  textarea.selectionEnd = start + prefixed.length;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function FormatToolbar({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 border border-b-0 border-slate-200 rounded-t-lg">
      <button
        type="button"
        onClick={() => { if (textareaRef.current) insertFormat(textareaRef.current, '**', '**'); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
        title="Tebal (Bold)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <span className="w-px h-4 bg-slate-300" />
      <button
        type="button"
        onClick={() => { if (textareaRef.current) insertBullet(textareaRef.current); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => { if (textareaRef.current) insertNumbered(textareaRef.current); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FieldGroup({ label, value, onChange, disabled, rows = 3, placeholder, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  error?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="space-y-0.5">
      <label className="block text-xs font-semibold text-slate-700 mb-0.5">{label}</label>
      <FormatToolbar textareaRef={textareaRef} />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm border rounded-b-lg focus:ring-2 focus:border-blue-500 outline-none transition-all resize-y disabled:bg-slate-50 disabled:text-slate-500 placeholder:text-slate-300 ${
          error ? 'border-rose-300 focus:ring-rose-500/20 bg-rose-50' : 'border-slate-200 focus:ring-blue-500/20'
        }`}
      />
      {error && (
        <p className="text-[11px] text-rose-500 mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}

export const FgdForm: React.FC<FgdFormProps> = ({ groupNumber, initialData, sessionLabel, sessionName, onSubmit, disabled }) => {
  const [form, setForm] = useState<FgdFormData>(() => {
    if (initialData) {
      const { id, createdAt, updatedAt, groupNumber: _, ...rest } = initialData;
      return rest;
    }
    return { ...emptyForm, sessionName: sessionName || emptyForm.sessionName };
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (initialData) {
      const { id, createdAt, updatedAt, groupNumber: _, ...rest } = initialData;
      setForm(rest);
      setErrors({});
    } else {
      setForm({ ...emptyForm, sessionName: sessionName || emptyForm.sessionName });
      setErrors({});
    }
  }, [initialData, groupNumber, sessionName]);

  const update = useCallback((key: keyof FgdFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    for (const field of REQUIRED_FIELDS) {
      if (!form[field]?.trim()) {
        newErrors[field] = `${FIELD_LABELS[field] || field} harus diisi`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle = (title: string) => (
    <h3 className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
      {title}
    </h3>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session (read-only) & Author Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Sesi FGD
          </label>
          <div className="px-3 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl">
            {sessionLabel || form.sessionName}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sesi dipilih di bagian atas — pilih grup & sesi dulu.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nama Notulis / Pengisi <span className="text-slate-400 font-normal">(opsional)</span>
          </label>
          <input
            type="text"
            value={form.authorName ?? ''}
            onChange={e => update('authorName', e.target.value)}
            disabled={disabled}
            placeholder="Contoh: Ahmad F."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500 placeholder:text-slate-300"
          />
        </div>
      </div>

      {sectionTitle('USULAN PERMASALAHAN')}
      <FieldGroup
        label="Usulan Permasalahan"
        value={form.usulanPermasalahan}
        onChange={v => update('usulanPermasalahan', v)}
        disabled={disabled}
        rows={4}
        placeholder="Tuliskan poin-poin usulan permasalahan di sini...&#10;Contoh:&#10;1. Masalah A&#10;2. Masalah B"
        error={errors.usulanPermasalahan}
      />

      {sectionTitle('PROBLEM - PENYEBAB')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Problem" value={form.problem} onChange={v => update('problem', v)} disabled={disabled} rows={4} placeholder="Tuliskan problem utama..." error={errors.problem} />
        <FieldGroup label="Penyebab" value={form.penyebab} onChange={v => update('penyebab', v)} disabled={disabled} rows={4} placeholder="Tuliskan akar penyebab..." error={errors.penyebab} />
        {/* Field Solusi disembunyikan dari form (landing & input admin). Nilai lama tetap dipertahankan saat edit melalui initialData.
            <FieldGroup label="Solusi" value={form.solusi} onChange={v => update('solusi', v)} disabled={disabled} rows={4} placeholder="Tuliskan usulan solusi..." error={errors.solusi} /> */}
      </div>

      {sectionTitle('ACTION PLAN')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Bidang PPG" value={form.actionPlanBidangPpg} onChange={v => update('actionPlanBidangPpg', v)} disabled={disabled} rows={3} error={errors.actionPlanBidangPpg} />
        <FieldGroup label="Deskripsi" value={form.actionPlanDeskripsi} onChange={v => update('actionPlanDeskripsi', v)} disabled={disabled} rows={3} error={errors.actionPlanDeskripsi} />
        <FieldGroup label="Nama Kegiatan" value={form.actionPlanNamaKegiatan} onChange={v => update('actionPlanNamaKegiatan', v)} disabled={disabled} rows={3} error={errors.actionPlanNamaKegiatan} />
        <FieldGroup label="Peserta" value={form.actionPlanPeserta} onChange={v => update('actionPlanPeserta', v)} disabled={disabled} rows={3} error={errors.actionPlanPeserta} />
        <FieldGroup label="Waktu" value={form.actionPlanWaktu} onChange={v => update('actionPlanWaktu', v)} disabled={disabled} rows={3} error={errors.actionPlanWaktu} />
        <FieldGroup label="Dana" value={form.actionPlanDana} onChange={v => update('actionPlanDana', v)} disabled={disabled} rows={3} error={errors.actionPlanDana} />
      </div>

      {sectionTitle('PERAN 5 UNSUR')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Peran Keimaman" value={form.peranKeimaman} onChange={v => update('peranKeimaman', v)} disabled={disabled} rows={3} placeholder="Tuliskan peran masing-masing unsur di sini..." />
        <FieldGroup label="Peran Pengurus" value={form.peranPengurus} onChange={v => update('peranPengurus', v)} disabled={disabled} rows={3} placeholder="Tuliskan peran masing-masing unsur di sini..." />
        <FieldGroup label="Peran Orang Tua" value={form.peranOrangTua} onChange={v => update('peranOrangTua', v)} disabled={disabled} rows={3} placeholder="Tuliskan peran masing-masing unsur di sini..." />
        <FieldGroup label="Peran Mubaligh" value={form.peranMubaligh} onChange={v => update('peranMubaligh', v)} disabled={disabled} rows={3} placeholder="Tuliskan peran masing-masing unsur di sini..." />
        <FieldGroup label="Peran Ahli Pendidik" value={form.peranAhliPendidik} onChange={v => update('peranAhliPendidik', v)} disabled={disabled} rows={3} placeholder="Tuliskan peran masing-masing unsur di sini..." />
      </div>

      {!disabled && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Menyimpan...
              </>
            ) : (
              <>Simpan Notulis Grup {groupNumber}</>
            )}
          </button>
        </div>
      )}
    </form>
  );
};
