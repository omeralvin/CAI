import React, { useState, useRef, useCallback } from 'react';
import { FgdMinute } from '../types';
import { Bold, List, ListOrdered } from 'lucide-react';

type FgdFormData = Omit<FgdMinute, 'id' | 'createdAt' | 'updatedAt' | 'groupNumber'>;

interface FgdFormProps {
  groupNumber: number;
  initialData: FgdMinute | null;
  onSubmit: (data: FgdFormData) => Promise<void>;
  disabled?: boolean;
}

const emptyForm: FgdFormData = {
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

function FieldGroup({ label, value, onChange, disabled, rows = 3 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
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
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-b-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-y disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

export const FgdForm: React.FC<FgdFormProps> = ({ groupNumber, initialData, onSubmit, disabled }) => {
  const [form, setForm] = useState<FgdFormData>(() => {
    if (initialData) {
      const { id, createdAt, updatedAt, groupNumber: _, ...rest } = initialData;
      return rest;
    }
    return { ...emptyForm };
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (initialData) {
      const { id, createdAt, updatedAt, groupNumber: _, ...rest } = initialData;
      setForm(rest);
    } else {
      setForm({ ...emptyForm });
    }
  }, [initialData, groupNumber]);

  const update = useCallback((key: keyof FgdFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      {sectionTitle('USULAN PERMASALAHAN')}
      <FieldGroup
        label="Usulan Permasalahan"
        value={form.usulanPermasalahan}
        onChange={v => update('usulanPermasalahan', v)}
        disabled={disabled}
        rows={4}
      />

      {sectionTitle('PROBLEM - PENYEBAB - SOLUSI')}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FieldGroup label="Problem" value={form.problem} onChange={v => update('problem', v)} disabled={disabled} rows={4} />
        <FieldGroup label="Penyebab" value={form.penyebab} onChange={v => update('penyebab', v)} disabled={disabled} rows={4} />
        <FieldGroup label="Solusi" value={form.solusi} onChange={v => update('solusi', v)} disabled={disabled} rows={4} />
      </div>

      {sectionTitle('ACTION PLAN')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Bidang PPG" value={form.actionPlanBidangPpg} onChange={v => update('actionPlanBidangPpg', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Deskripsi" value={form.actionPlanDeskripsi} onChange={v => update('actionPlanDeskripsi', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Nama Kegiatan" value={form.actionPlanNamaKegiatan} onChange={v => update('actionPlanNamaKegiatan', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Peserta" value={form.actionPlanPeserta} onChange={v => update('actionPlanPeserta', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Waktu" value={form.actionPlanWaktu} onChange={v => update('actionPlanWaktu', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Dana" value={form.actionPlanDana} onChange={v => update('actionPlanDana', v)} disabled={disabled} rows={3} />
      </div>

      {sectionTitle('PERAN 5 UNSUR')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Peran Keimaman" value={form.peranKeimaman} onChange={v => update('peranKeimaman', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Peran Pengurus" value={form.peranPengurus} onChange={v => update('peranPengurus', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Peran Orang Tua" value={form.peranOrangTua} onChange={v => update('peranOrangTua', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Peran Mubaligh" value={form.peranMubaligh} onChange={v => update('peranMubaligh', v)} disabled={disabled} rows={3} />
        <FieldGroup label="Peran Ahli Pendidik" value={form.peranAhliPendidik} onChange={v => update('peranAhliPendidik', v)} disabled={disabled} rows={3} />
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
