import React, { useState, useEffect, useRef } from 'react';
import { FgdMinute } from '../types';
import { FgdForm } from '../components/FgdForm';
import logoWarna from '../../assets/image/logo_warna.png';
import {
  Table2, FileEdit, Presentation, Download, Trash2, Eye,
  ChevronDown, Maximize2, Minimize2, FileText, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5050/api';
const GROUPS = Array.from({ length: 15 }, (_, i) => i + 1);

type TabId = 'rekap' | 'input' | 'presentasi';

function getHeaders() {
  const token = localStorage.getItem('cai_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export const AdminFgd: React.FC = () => {
  const [tab, setTab] = useState<TabId>('rekap');
  const [allData, setAllData] = useState<FgdMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [editData, setEditData] = useState<FgdMinute | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presentGroup, setPresentGroup] = useState<number | null>(null);
  const [presentData, setPresentData] = useState<FgdMinute | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const presRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notulis`, { headers: getHeaders() });
      if (res.ok) {
        const data: FgdMinute[] = await res.json();
        setAllData(data);
      }
    } catch { } finally {
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
    try {
      const res = await fetch(`${API_BASE_URL}/notulis/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showMessage('success', 'Data berhasil dihapus');
        fetchAll();
      } else {
        showMessage('error', 'Gagal menghapus data');
      }
    } catch {
      showMessage('error', 'Gagal terhubung ke server');
    }
    setDeleteConfirm(null);
  };

  const handleSubmitForm = async (formData: Omit<FgdMinute, 'id' | 'createdAt' | 'updatedAt' | 'groupNumber'>) => {
    if (selectedGroup === null) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notulis`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupNumber: selectedGroup, ...formData }),
      });
      if (res.ok) {
        showMessage('success', `Data Grup ${selectedGroup} berhasil disimpan!`);
        fetchAll();
      } else {
        showMessage('error', 'Gagal menyimpan data');
      }
    } catch {
      showMessage('error', 'Gagal terhubung ke server');
    }
  };

  const handlePresent = async (groupNumber: number) => {
    setPresentGroup(groupNumber);
    setPresentData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/notulis/group/${groupNumber}`);
      if (res.ok) {
        const d = await res.json();
        setPresentData(d);
      }
    } catch { }
    setTab('presentasi');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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

  const getGroupData = (gn: number) => allData.find(d => d.groupNumber === gn);

  const tabs: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'rekap', label: 'Rekap Data', icon: Table2 },
    { id: 'input', label: 'Input / Edit', icon: FileEdit },
    { id: 'presentasi', label: 'Presentasi', icon: Presentation },
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
          <button onClick={handleExportAll} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export All PDF
          </button>
          <div className="relative">
            <select
              onChange={e => { if (e.target.value) handleExportGroup(parseInt(e.target.value)); e.target.value = ''; }}
              className="appearance-none px-3 py-2 pr-8 text-xs font-semibold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer outline-none"
              defaultValue=""
            >
              <option value="" disabled>Export PDF per Group</option>
              {GROUPS.map(g => (
                <option key={g} value={g}>Grup {g}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Grup</th>
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
                {GROUPS.map(g => {
                  const d = getGroupData(g);
                  return (
                    <tr key={g} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-700">Grup {g}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[180px] truncate">{d?.usulanPermasalahan || '-'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d?.problem || '-'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d?.penyebab || '-'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d?.solusi || '-'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate">{d?.actionPlanBidangPpg || '-'}</td>
                      <td className="px-3 py-3 text-center">
                        {d ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle className="h-3 w-3" /> Terisi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <XCircle className="h-3 w-3" /> Kosong
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => d && handleEdit(d)}
                            disabled={!d}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
                            title="Edit"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handlePresent(g)}
                            disabled={!d}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
                            title="Presentasi"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => d && setDeleteConfirm(d.id)}
                            disabled={!d}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
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
      )}

      {/* Tab: Input / Edit */}
      {tab === 'input' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Grup</label>
            <div className="relative max-w-xs">
              <select
                value={selectedGroup ?? ''}
                onChange={e => {
                  const gn = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedGroup(gn);
                  if (gn) {
                    const existing = getGroupData(gn);
                    setEditData(existing || null);
                  } else {
                    setEditData(null);
                  }
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
          </div>
          {selectedGroup !== null ? (
            <FgdForm
              key={selectedGroup}
              groupNumber={selectedGroup}
              initialData={editData}
              onSubmit={handleSubmitForm}
            />
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileEdit className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Pilih grup untuk memulai input data</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Presentasi */}
      {tab === 'presentasi' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">Pilih Grup:</label>
              <div className="relative">
                <select
                  value={presentGroup ?? ''}
                  onChange={e => {
                    const gn = e.target.value ? parseInt(e.target.value) : null;
                    setPresentGroup(gn);
                    if (gn) handlePresent(gn);
                  }}
                  className="appearance-none px-4 py-2 pr-10 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Pilih --</option>
                  {GROUPS.map(g => (
                    <option key={g} value={g}>Grup {g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                {isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              </button>
            </div>
          </div>

          <div
            ref={presRef}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 transition-all"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {presentData ? (
              <div className="space-y-6">
                <div className="text-center border-b-2 border-blue-600 pb-4 mb-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-blue-800">
                    FGD — Grup {presentData.groupNumber}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Cinta Alam Indonesia
                  </p>
                </div>

                <Section title="USULAN PERMASALAHAN" content={presentData.usulanPermasalahan} />
                <ThreeColSection
                  title="PROBLEM - PENYEBAB - SOLUSI"
                  col1={{ label: 'Problem', content: presentData.problem }}
                  col2={{ label: 'Penyebab', content: presentData.penyebab }}
                  col3={{ label: 'Solusi', content: presentData.solusi }}
                />
                <GridSection
                  title="ACTION PLAN"
                  items={[
                    { label: 'Bidang PPG', content: presentData.actionPlanBidangPpg },
                    { label: 'Deskripsi', content: presentData.actionPlanDeskripsi },
                    { label: 'Nama Kegiatan', content: presentData.actionPlanNamaKegiatan },
                    { label: 'Peserta', content: presentData.actionPlanPeserta },
                    { label: 'Waktu', content: presentData.actionPlanWaktu },
                    { label: 'Dana', content: presentData.actionPlanDana },
                  ]}
                />
                <GridSection
                  title="PERAN 5 UNSUR"
                  items={[
                    { label: 'Peran Keimaman', content: presentData.peranKeimaman },
                    { label: 'Peran Pengurus', content: presentData.peranPengurus },
                    { label: 'Peran Orang Tua', content: presentData.peranOrangTua },
                    { label: 'Peran Mubaligh', content: presentData.peranMubaligh },
                    { label: 'Peran Ahli Pendidik', content: presentData.peranAhliPendidik },
                  ]}
                />
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <Presentation className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-base font-medium">Pilih grup untuk menampilkan data</p>
              </div>
            )}
          </div>
        </div>
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
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                Batal
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all">
                Hapus
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

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">{title}</div>
      <div className="px-4 py-3 text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
        {content || '-'}
      </div>
    </div>
  );
}

function ThreeColSection({
  title, col1, col2, col3
}: {
  title: string;
  col1: { label: string; content: string };
  col2: { label: string; content: string };
  col3: { label: string; content: string };
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {[col1, col2, col3].map((c, i) => (
          <div key={i} className="p-4">
            <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wide">{c.label}</div>
            <div className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridSection({ title, items }: { title: string; items: { label: string; content: string }[] }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-x divide-slate-200">
        {items.map((item, i) => (
          <div key={i} className={`p-4 ${i >= items.length - 2 ? 'sm:border-b-0' : ''}`}>
            <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wide">{item.label}</div>
            <div className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
