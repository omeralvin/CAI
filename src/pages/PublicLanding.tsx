import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FgdMinute } from '../types';
import { FgdForm } from '../components/FgdForm';
import { useApp } from '../context/AppContext';
import logoWarna from '../../assets/image/logo_warna.png';
import { ChevronDown, FileText, LogIn, AlertTriangle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5050/api';
const GROUPS = Array.from({ length: 15 }, (_, i) => i + 1);
const SESSION_OPTIONS = ['Sesi 1', 'Sesi 2', 'Sesi 3', 'Sesi 4', 'Sesi 5'];

interface StatusCache {
  [key: string]: { isFilled: boolean; updatedAt: string | null };
}

export const PublicLanding: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState('Sesi 1');
  const [data, setData] = useState<FgdMinute | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [statusCache, setStatusCache] = useState<StatusCache>({});
  const [pendingSession, setPendingSession] = useState<string | null>(null);
  const prevGroupRef = useRef<number | null>(null);
  const dataFetchedRef = useRef(false);

  const checkStatus = useCallback(async (group: number, session: string) => {
    const key = `${group}-${session}`;
    if (statusCache[key]) return statusCache[key];
    try {
      const res = await fetch(`${API_BASE_URL}/notulis/check-status?groupNumber=${group}&sessionId=${encodeURIComponent(session)}`);
      if (res.ok) {
        const result = await res.json();
        setStatusCache(prev => ({ ...prev, [key]: result }));
        return result;
      }
    } catch { }
    return null;
  }, [statusCache]);

  const loadSession = useCallback(async (group: number, session: string) => {
    setLoading(true);
    setMessage(null);
    dataFetchedRef.current = true;
    try {
      const res = await fetch(`${API_BASE_URL}/notulis/group/${group}?session=${encodeURIComponent(session)}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGroupChange = (gn: number | null) => {
    dataFetchedRef.current = false;
    setSelectedGroup(gn);
    setSelectedSession('Sesi 1');
    setData(null);
    setPendingSession(null);
  };

  const handleSessionChange = async (session: string) => {
    if (selectedGroup === null) return;

    const status = await checkStatus(selectedGroup, session);
    if (status && status.isFilled) {
      setPendingSession(session);
    } else {
      setPendingSession(null);
      setSelectedSession(session);
      loadSession(selectedGroup, session);
    }
  };

  const handleEditExisting = () => {
    if (selectedGroup === null || !pendingSession) return;
    setSelectedSession(pendingSession);
    loadSession(selectedGroup, pendingSession);
    setPendingSession(null);
  };

  const handleChooseOtherSession = () => {
    if (selectedGroup === null || !pendingSession) return;
    const empty = SESSION_OPTIONS.find(s => {
      const key = `${selectedGroup}-${s}`;
      return !statusCache[key]?.isFilled;
    });
    if (empty) {
      setSelectedSession(empty);
      loadSession(selectedGroup, empty);
    }
    setPendingSession(null);
  };

  useEffect(() => {
    if (prevGroupRef.current !== selectedGroup) {
      setStatusCache({});
      prevGroupRef.current = selectedGroup;
    }
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
      const key = `${selectedGroup}-${selectedSession}`;
      setStatusCache(prev => ({ ...prev, [key]: { isFilled: true, updatedAt: saved.updatedAt } }));
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
        {/* Group & Session Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2.5">
            Pilih Grup & Sesi FGD
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <select
                value={selectedGroup ?? ''}
                onChange={e => handleGroupChange(e.target.value ? parseInt(e.target.value) : null)}
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
                value={selectedSession}
                onChange={e => handleSessionChange(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                disabled={selectedGroup === null}
              >
                {SESSION_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Form */}
        {selectedGroup !== null && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">
                Form Notulis — Grup {selectedGroup} — {selectedSession}
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

        {/* Warning Modal */}
        {pendingSession && selectedGroup !== null && statusCache[`${selectedGroup}-${pendingSession}`]?.isFilled && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Data Sudah Ada</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Grup {selectedGroup} — {pendingSession}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">
                Data notulis untuk sesi ini sudah pernah diisi
                {statusCache[`${selectedGroup}-${pendingSession}`]?.updatedAt && (
                  <> pada {new Date(statusCache[`${selectedGroup}-${pendingSession}`]!.updatedAt!).toLocaleString('id-ID')}</>
                )}.
              </p>
              <p className="text-sm text-slate-500 mb-5">
                Apakah Anda ingin memuat data lama untuk diedit, atau memilih sesi lain?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleChooseOtherSession}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Pilih Sesi Lain
                </button>
                <button
                  onClick={handleEditExisting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
                >
                  Edit Data Lama
                </button>
              </div>
            </div>
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
