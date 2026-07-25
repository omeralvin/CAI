import React, { useState, useEffect } from 'react';
import { FgdMinute } from '../types';
import { FgdForm } from '../components/FgdForm';
import { useApp } from '../context/AppContext';
import logoWarna from '../../assets/image/logo_warna.png';
import { ChevronDown, FileText, LogIn } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5050/api';
const GROUPS = Array.from({ length: 15 }, (_, i) => i + 1);

export const PublicLanding: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [data, setData] = useState<FgdMinute | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (selectedGroup === null) return;
    setLoading(true);
    setMessage(null);
    fetch(`${API_BASE_URL}/notulis/group/${selectedGroup}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedGroup]);

  const handleSubmit = async (formData: Omit<FgdMinute, 'id' | 'createdAt' | 'updatedAt' | 'groupNumber'>) => {
    if (selectedGroup === null) return;
    setMessage(null);
    const res = await fetch(`${API_BASE_URL}/notulis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupNumber: selectedGroup, ...formData }),
    });
    if (res.ok) {
      const saved = await res.json();
      setData(saved);
      setMessage({ type: 'success', text: `Data Grup ${selectedGroup} berhasil disimpan!` });
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({ type: 'error', text: 'Gagal menyimpan data. Silakan coba lagi.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white font-['Poppins'] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <img src={logoWarna} alt="Logo CAI" className="h-12 w-auto" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
              Notulis FGD
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide">
              Cinta Alam Indonesia — Focus Group Discussion
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Group Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2.5">
            Pilih Grup
          </label>
          <div className="relative max-w-xs">
            <select
              value={selectedGroup ?? ''}
              onChange={e => setSelectedGroup(e.target.value ? parseInt(e.target.value) : null)}
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

        {/* Form */}
        {selectedGroup !== null && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">
                Form Notulis — Grup {selectedGroup}
              </h2>
              {data && (
                <span className="ml-auto text-[11px] text-slate-400">
                  Terakhir diperbarui: {new Date(data.updatedAt).toLocaleString('id-ID')}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              </div>
            ) : (
              <FgdForm
                groupNumber={selectedGroup}
                initialData={data}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        )}

        {/* Empty state */}
        {selectedGroup === null && (
          <div className="text-center py-16 text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Silakan pilih grup untuk mulai mengisi notulis</p>
          </div>
        )}

        {/* Toast message */}
        {message && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
            message.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}>
            {message.text}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/80 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            &copy; 2026 Cinta Alam Indonesia
          </span>
          <button
            onClick={() => setCurrentPage('login')}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <LogIn className="h-3 w-3" />
            Login Admin
          </button>
        </div>
      </footer>
    </div>
  );
};
