import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { DashboardData, AttendanceSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Settings,
  AlertTriangle,
  ChevronRight,
  Activity,
  X,
  Save,
  Plus,
  CalendarClock,
  Loader2
} from 'lucide-react';

const SESSION_LABELS = ['Sesi 1', 'Sesi 2', 'Sesi 3', 'Sesi 4', 'Sesi 5'];

export const AdminDashboard: React.FC = () => {
  const { sessions, fetchSessions, upsertSession, fetchDashboard, resetAllAttendance } = useApp();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editSessions, setEditSessions] = useState<Partial<AttendanceSession>[]>([]);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('07:30');
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = useCallback(async (sessionId?: string) => {
    setLoading(true);
    const data = await fetchDashboard(sessionId);
    setDashboard(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      const latest = sessions[sessions.length - 1];
      setSelectedSessionId(latest.id);
      loadDashboard(latest.id);
    }
  }, [sessions, selectedSessionId, loadDashboard]);

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    loadDashboard(id);
  };

  // const handleOpenSettings = () => {
  //   setEditSessions(sessions.map(s => ({ ...s })));
  //   setShowSettings(true);
  // };

  const handleEditField = (index: number, field: string, value: string) => {
    setEditSessions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveSessions = async () => {
    setSaving(true);
    for (const s of editSessions) {
      if (s.dayName && s.date && s.sessionNumber) {
        await upsertSession({
          id: s.id,
          dayName: s.dayName,
          date: s.date,
          sessionNumber: s.sessionNumber,
          startTime: s.startTime || '07:30',
          name: s.name || '',
        });
      }
    }
    await fetchSessions();
    setSaving(false);
    setShowSettings(false);
    if (selectedSessionId) loadDashboard(selectedSessionId);
  };

  const handleSubmitSession = async () => {
    if (!sessionName || !sessionDate || !startTime) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('cai_token');
      const res = await fetch('http://localhost:5050/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: sessionName,
          date: new Date(sessionDate).toISOString(),
          startTime,
        }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      setIsModalOpen(false);
      setSessionName('');
      setSessionDate('');
      setStartTime('07:30');
      await fetchSessions();
      if (selectedSessionId) loadDashboard(selectedSessionId);
    } catch (err) {
      console.error('Create session failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPdf = async () => {
    const token = localStorage.getItem('cai_token');
    if (!token) return;
    const url = selectedSessionId
      ? `http://localhost:5050/api/analytics/export-pdf?sessionId=${selectedSessionId}`
      : `http://localhost:5050/api/analytics/export-pdf`;
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `laporan-absensi-${dashboard?.session?.name || 'sesi'}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  const summary = dashboard?.summary;
  const lateList = dashboard?.lateList || [];
  const groupStats = dashboard?.groupStats || [];
  const currentSession = dashboard?.session;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau statistik kehadiran per sesi, daftar terlambat, dan performa kelompok.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            Export Laporan PDF
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Buat Sesi Baru
          </button>
          {/* <button
            onClick={handleOpenSettings}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Settings className="h-3.5 w-3.5" />
            Pengaturan Sesi
          </button> */}
          {/* <button
            onClick={resetAllAttendance}
            className="px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          > */}
            {/* <RefreshCw className="h-3.5 w-3.5" />
            Reset Data
          </button> */}
        </div>
      </div>

      {/* Session Selector */}
      <div className="mb-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Sesi Aktif</span>
          {currentSession && (
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              {currentSession.dayName} &middot; {new Date(currentSession.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} &middot; Jam Masuk {currentSession.startTime}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sessions.length === 0 ? (
            <span className="text-xs text-slate-400 italic">Belum ada sesi. Buat di Pengaturan Sesi.</span>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  selectedSessionId === s.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span>{s.name || SESSION_LABELS[s.sessionNumber - 1] || `Sesi ${s.sessionNumber}`}</span>
                  <span className={`text-[9px] font-mono ${selectedSessionId === s.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {s.dayName} &middot; {s.startTime}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KPICard
          label="Total Terdaftar"
          value={summary?.total ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="slate"
        />
        <KPICard
          label="Hadir"
          value={summary?.present ?? 0}
          icon={<UserCheck className="h-5 w-5" />}
          color="blue"
        />
        <KPICard
          label="Absen"
          value={summary?.absent ?? 0}
          icon={<UserX className="h-5 w-5" />}
          color="amber"
        />
        <KPICard
          label="Terlambat"
          value={summary?.lateCount ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="rose"
        />
      </div>

      {loading && (
        <div className="text-center py-12 text-sm text-slate-400 flex items-center justify-center gap-2">
          <Activity className="h-4 w-4 animate-spin" />
          Memuat data analytics...
        </div>
      )}

      {!loading && dashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">

            {/* Group Performance */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kehadiran per Kelompok</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Persentase kehadiran & jumlah terlambat</p>
                </div>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              {groupStats.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada data untuk sesi ini.</p>
              ) : (
                <div className="space-y-5">
                  {groupStats.map(stat => (
                    <div key={stat.group} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{stat.group}</span>
                        <div className="flex items-center gap-3">
                          {stat.late > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                              {stat.late} terlambat
                            </span>
                          )}
                          <span className="text-slate-500 font-semibold">
                            {stat.present}/{stat.total} ({stat.percent}%)
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.percent > 75 ? 'bg-blue-600' : stat.percent > 40 ? 'bg-blue-500' : 'bg-blue-400'
                          }`}
                          style={{ width: `${stat.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Late List */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Daftar Terlambat
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  {lateList.length} orang
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {lateList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada keterlambatan di sesi ini.
                  </div>
                ) : (
                  lateList.map((item, idx) => (
                    <div key={item.participantId + idx} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{item.participantName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">{item.participantId}</span>
                          <span className="text-[10px] text-slate-400">&middot;</span>
                          <span className="text-[10px] text-slate-500">{item.group}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg shrink-0">
                        +{item.lateDuration ?? 0} mnt
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  Pengaturan Sesi Absensi
                </h3>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                {editSessions.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {SESSION_LABELS[s.sessionNumber || idx] || `Sesi ${s.sessionNumber || idx + 1}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hari</label>
                        <select
                          value={s.dayName || ''}
                          onChange={e => handleEditField(idx, 'dayName', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Pilih Hari</option>
                          <option value="Jumat">Jumat</option>
                          <option value="Sabtu">Sabtu</option>
                          <option value="Minggu">Minggu</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tanggal</label>
                        <input
                          type="date"
                          value={s.date ? new Date(s.date).toISOString().split('T')[0] : ''}
                          onChange={e => handleEditField(idx, 'date', new Date(e.target.value).toISOString())}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jam Masuk</label>
                        <input
                          type="time"
                          value={s.startTime || '07:30'}
                          onChange={e => handleEditField(idx, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Sesi</label>
                        <input
                          type="text"
                          value={s.name || ''}
                          onChange={e => handleEditField(idx, 'name', e.target.value)}
                          placeholder={`Sesi ${idx + 1}`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveSessions}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Menyimpan...' : 'Simpan Semua Sesi'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Session Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!submitting) setIsModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-emerald-600" />
                  Buat Sesi Baru
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Nama Sesi
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    placeholder="Materi Sesi 1 / Pembukaan"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Tanggal Sesi
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    min="2026-08-07"
                    max="2026-08-09"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Waktu Masuk / Batas Toleransi
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-30"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmitSession}
                  disabled={submitting || !sessionName || !sessionDate || !startTime}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {submitting ? 'Menyimpan...' : 'Simpan Sesi'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Reusable KPI Card component
const KPICard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'slate' | 'blue' | 'amber' | 'rose';
}> = ({ label, value, icon, color }) => {
  const colorMap = {
    slate: { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' },
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600', bar: 'bg-rose-500' },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold ${c.text} uppercase tracking-wider`}>{label}</span>
        <div className={`p-2 ${c.bg} border ${c.border} rounded-lg ${c.text}`}>{icon}</div>
      </div>
      <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${c.bar}`} />
    </div>
  );
};
