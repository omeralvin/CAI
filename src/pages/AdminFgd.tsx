import React, { useState, useEffect } from 'react';
import { FgdMinute, FgdTheme } from '../types';
import { FgdForm } from '../components/FgdForm';
import { useApp } from '../context/AppContext';
import { API_BASE_URL } from '../api';
import { fetchFgdThemes, fgdThemeLabel, fgdThemeLabelFor, getHeaders } from '../utils/fgdThemes';
import logoWarna from '../../assets/image/logo_warna.png';
import {
  Table2, FileEdit, Download, Trash2, Eye,
  ChevronDown, FileText, CheckCircle, XCircle, AlertTriangle, Monitor, Plus, Settings2
} from 'lucide-react';
const GROUPS = Array.from({ length: 15 }, (_, i) => i + 1);

const emptyForm: Omit<FgdMinute, 'id' | 'createdAt' | 'updatedAt' | 'groupNumber'> = {
  sessionName: '',
  authorName: null,
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

type TabId = 'rekap' | 'input';

const FgdThemeManager: React.FC<{
  themes: FgdTheme[];
  onClose: () => void;
  onChanged: () => void;
}> = ({ themes, onClose, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newMinutes, setNewMinutes] = useState('10');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [editMinutes, setEditMinutes] = useState('10');

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const clampMinutes = (v: string) => Math.max(1, Math.min(600, parseInt(v) || 10));

  const run = async (fn: () => Promise<boolean>, okMsg: string) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) { flash('success', okMsg); onChanged(); }
    else flash('error', 'Gagal menyimpan. Periksa isian (nama sesi wajib & unik).');
  };

  const handleAdd = () => {
    if (!newName.trim()) { flash('error', 'Nama sesi wajib diisi!'); return; }
    run(async () => {
      const res = await fetch(`${API_BASE_URL}/notulis/themes`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ name: newName.trim(), theme: newTheme.trim(), timerMinutes: clampMinutes(newMinutes) }),
      });
      if (res.ok) { setNewName(''); setNewTheme(''); setNewMinutes('10'); return true; }
      return false;
    }, 'Tema sesi berhasil ditambahkan');
  };

  const handleSaveEdit = () => {
    if (!editId || !editName.trim()) { flash('error', 'Nama sesi wajib diisi!'); return; }
    run(async () => {
      const res = await fetch(`${API_BASE_URL}/notulis/themes/${editId}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ name: editName.trim(), theme: editTheme, timerMinutes: clampMinutes(editMinutes) }),
      });
      if (res.ok) { setEditId(null); return true; }
      return false;
    }, 'Perubahan tersimpan');
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus sesi "${name}"? Data notulis yang memakai sesi ini tetap tersimpan.`)) return;
    run(async () => {
      const res = await fetch(`${API_BASE_URL}/notulis/themes/${id}`, { method: 'DELETE', headers: getHeaders() });
      return res.ok;
    }, 'Sesi berhasil dihapus');
  };

  const startEdit = (t: FgdTheme) => {
    setEditId(t.id); setEditName(t.name); setEditTheme(t.theme); setEditMinutes(String(t.timerMinutes ?? 10));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-600" /> Kelola Tema Sesi FGD
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Atur tema & durasi timer presentasi untuk tiap sesi di layar lebar.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Tutup">✕</button>
        </div>

        {msg && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-semibold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {msg.text}
          </div>
        )}

        {/* Daftar sesi */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-4">
          {themes.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">Belum ada sesi. Tambahkan di bawah.</div>
          )}
          {themes.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-3 flex items-start gap-3 bg-slate-50/50">
              <span className="text-[10px] font-mono text-slate-400 mt-1 w-5 text-right">{t.order}</span>
              {editId === t.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="Nama sesi (mis. Sesi 1)" />
                    <input value={editTheme} onChange={e => setEditTheme(e.target.value)}
                      className="flex-[2] px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="Tema / materi sesi" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Durasi Presentasi:</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={1} max={600} value={editMinutes} onChange={e => setEditMinutes(e.target.value)}
                        className="w-20 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                      <span className="text-[11px] text-slate-400">menit</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={busy}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                      {busy && (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      )}
                      {busy ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-colors">Batal</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-800">{t.name}</div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                      ⏱ {t.timerMinutes ?? 10} menit
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.theme.trim() || <span className="italic text-slate-300">Belum ada tema</span>}</div>
                </div>
              )}
              {editId !== t.id && (
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">✏️</button>
                  <button onClick={() => handleDelete(t.id, t.name)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors" title="Hapus">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tambah baru */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="Nama sesi (mis. Sesi 6)" />
            <input value={newTheme} onChange={e => setNewTheme(e.target.value)}
              className="flex-[2] px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="Tema / materi sesi (mis. Peran Keluarga)" />
          </div>
          <div className="flex items-end gap-2 mt-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Durasi Presentasi (menit)</label>
              <input type="number" min={1} max={600} value={newMinutes} onChange={e => setNewMinutes(e.target.value)}
                className="w-24 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
            </div>
            <button onClick={handleAdd} disabled={busy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
              {busy ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Menyimpan...
                </>
              ) : (
                <><Plus className="h-3.5 w-3.5" /> Tambah Sesi</>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Durasi ini dipakai sebagai timer presentasi layar lebar saat sesi dibawakan. Sesi yang dihapus tidak akan muncul lagi di form publik & admin, namun data notulis lama tetap aman.</p>
        </div>
      </div>
    </div>
  );
};

export const AdminFgd: React.FC = () => {
  const { setCurrentPage, logout } = useApp();
  const [tab, setTab] = useState<TabId>('rekap');
  const [allData, setAllData] = useState<FgdMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [editData, setEditData] = useState<FgdMinute | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('Semua Sesi');
  const [themes, setThemes] = useState<FgdTheme[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const loadThemes = async () => {
    const data = await fetchFgdThemes();
    setThemes(data);
  };

  useEffect(() => { loadThemes(); }, []);

  const fetchAll = async (retries = 2) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notulis`, { headers: getHeaders() });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data: FgdMinute[] = await res.json();
        setAllData(Array.isArray(data) ? data : []);
        setFetchError(false);
        setLoading(false);
        return;
      }
    } catch { }
    if (retries > 0) {
      setTimeout(() => fetchAll(retries - 1), 1000);
    } else {
      setFetchError(true);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleEdit = (d: FgdMinute) => {
    setEditData(d);
    setSelectedGroup(d.groupNumber);
    setTab('input');
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notulis/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showMessage('success', 'Data berhasil dihapus');
        await fetchAll();
      } else {
        showMessage('error', 'Gagal menghapus data');
      }
    } catch {
      showMessage('error', 'Gagal terhubung ke server');
    }
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const handleSubmitForm = async (formData: Omit<FgdMinute, 'id' | 'createdAt' | 'updatedAt' | 'groupNumber'>) => {
    if (selectedGroup === null) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notulis`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupNumber: selectedGroup, ...formData }),
      });
      if (res.ok) {
        showMessage('success', `Data Grup ${selectedGroup} berhasil disimpan!`);
        await fetchAll();
        setEditData(null);
        setSelectedGroup(null);
        setTab('rekap');
      } else {
        const err = await res.json().catch(() => null);
        showMessage('error', err?.message || 'Gagal menyimpan data');
      }
    } catch {
      showMessage('error', 'Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const handlePresent = (data: FgdMinute | null) => {
    if (!data) return;
    setCurrentPage('admin-fgd-present');
  };

  const handleExportAll = () => {
    const token = localStorage.getItem('cai_token');
    const url = `${API_BASE_URL}/notulis/export-pdf`;
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'notulis-semua-grup.pdf';
        a.click();
      })
      .catch(() => showMessage('error', 'Gagal mengekspor PDF'));
  };

  const handleExportGroup = async (groupNumber?: number) => {
    const token = localStorage.getItem('cai_token');
    const gn = groupNumber ?? selectedGroup;
    if (!gn) return;
    const url = `${API_BASE_URL}/notulis/export-pdf/${gn}`;
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `notulis-grup-${gn}.pdf`;
        a.click();
      } else {
        showMessage('error', 'Data grup belum diisi');
      }
    } catch {
      showMessage('error', 'Gagal mengekspor PDF');
    }
  };

  const tabs: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'rekap', label: 'Rekap Data', icon: Table2 },
    { id: 'input', label: 'Input / Edit', icon: FileEdit },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Notulis FGD</h2>
          <p className="text-sm text-slate-500">Kelola data Focus Group Discussion</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowThemeModal(true)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer">
            <Settings2 className="h-4 w-4" /> Kelola Tema Sesi
          </button>
          <button onClick={() => setCurrentPage('admin-fgd-present')} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
            <Monitor className="h-4 w-4" /> Presentasi Layar Lebar
          </button>
          <div className="relative group">
            <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <Download className="h-4 w-4" /> Export PDF <ChevronDown className="h-3 w-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 overflow-hidden">
              <button onClick={() => { sessionStorage.removeItem('fgd_print_group'); setCurrentPage('admin-fgd-print'); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 border-b border-slate-100">
                <Download className="h-3.5 w-3.5 text-blue-500" /> Export Semua Grup
              </button>
              <div className="max-h-48 overflow-y-auto">
                {GROUPS.map(g => (
                  <button key={g} onClick={() => { sessionStorage.setItem('fgd_print_group', String(g)); setCurrentPage('admin-fgd-print'); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    Grup {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Rekap Data */}
      {tab === 'rekap' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">Filter Sesi:</label>
              <select
                value={sessionFilter}
                onChange={e => setSessionFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="Semua Sesi">Semua Sesi</option>
                {themes.map(t => (
                  <option key={t.id} value={t.name}>{fgdThemeLabel(t)}</option>
                ))}
              </select>
            {themes.length === 0 && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold">
                Tema sesi FGD belum dibuat
              </span>
            )}
          </div>
          {fetchError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Gagal memuat data dari server. Menampilkan data yang tersimpan terakhir — muat ulang halaman untuk mencoba lagi.
            </div>
          )}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                <p className="text-sm font-semibold text-slate-500">Memuat data...</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-bold text-slate-600">Grup</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Sesi</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Penulis</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Usulan Permasalahan</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Problem</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Penyebab</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Solusi</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-600">Bidang PPG</th>
                    <th className="text-center px-3 py-3 font-bold text-slate-600">Status</th>
                    <th className="text-center px-3 py-3 font-bold text-slate-600 w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.flatMap(g => {
                    const rows = sessionFilter === 'Semua Sesi'
                      ? allData.filter(d => d.groupNumber === g)
                      : allData.filter(d => d.groupNumber === g && d.sessionName === sessionFilter);

                    if (rows.length === 0) {
                      return (
                        <tr key={g} className="border-b border-slate-100 bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-700">Grup {g}</td>
                          <td className="px-3 py-3 text-slate-400" colSpan={9}>Belum ada data</td>
                        </tr>
                      );
                    }

                    return rows.map(d => (
                      <tr key={`${g}-${d.sessionName}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">Grup {g}</td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fgdThemeLabelFor(themes, d.sessionName)}</td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{d.authorName || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 max-w-[180px] truncate">{d.usulanPermasalahan || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d.problem || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d.penyebab || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d.solusi || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d.actionPlanBidangPpg || '-'}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle className="h-3 w-3" /> Terisi
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
                              <FileEdit className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handlePresent(d)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Presentasi">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(d.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors" title="Hapus">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })}
              </tbody>
            </table>
          </div>
          {allData.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Belum ada data notulis yang diinput</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Tab: Input / Edit */}
      {tab === 'input' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Grup & Sesi</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={selectedGroup ?? ''}
                  onChange={e => {
                    const gn = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedGroup(gn);
                    setEditData(null);
                  }}
                  className="w-full appearance-none px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">-- Pilih Grup --</option>
                  {GROUPS.map(g => (
                    <option key={g} value={g}>Grup {g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative flex-1">
                <select
                  value={editData?.sessionName ?? ''}
                  onChange={e => {
                    const session = e.target.value;
                    if (selectedGroup !== null) {
                      const existing = allData.find(d => d.groupNumber === selectedGroup && d.sessionName === session);
                      setEditData((existing || { ...emptyForm, sessionName: session }) as FgdMinute);
                    }
                  }}
                  className="w-full appearance-none px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  disabled={selectedGroup === null}
                >
                  <option value="">-- Pilih Sesi --</option>
                  {themes.map(t => (
                    <option key={t.id} value={t.name}>{fgdThemeLabel(t)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {themes.length === 0 && (
              <div className="mt-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span><b>Tema sesi FGD belum dibuat.</b> Klik tombol <b>"Kelola Tema Sesi"</b> di pojok kanan atas untuk menambahkan sesi beserta temanya terlebih dahulu.</span>
              </div>
            )}
          </div>
          {selectedGroup !== null ? (
            editData?.sessionName ? (
              <FgdForm
                key={`${selectedGroup}-${editData?.sessionName ?? ''}`}
                groupNumber={selectedGroup}
                initialData={editData}
                sessionLabel={fgdThemeLabelFor(themes, editData?.sessionName ?? '')}
                onSubmit={handleSubmitForm}
                disabled={saving}
              />
            ) : (
              <div className="text-center py-12 text-slate-400">
                <FileEdit className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Pilih sesi untuk memulai input data</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileEdit className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Pilih grup untuk memulai input data</p>
            </div>
          )}
        </div>
      )}



      {/* Kelola Tema Sesi FGD Modal */}
      {showThemeModal && (
        <FgdThemeManager
          themes={themes}
          onClose={() => setShowThemeModal(false)}
          onChanged={loadThemes}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Hapus Data</h3>
                <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50">
                Batal
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all flex items-center gap-2 disabled:opacity-60">
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Menghapus...
                  </>
                ) : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {message && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};


