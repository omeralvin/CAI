import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FgdMinute, FgdTheme, DashboardData, AttendanceSession } from '../types';
import { useApp } from '../context/AppContext';
import { API_BASE_URL } from '../api';
import { fetchFgdThemes, fgdThemeLabelFor } from '../utils/fgdThemes';
import { autoDetectActiveSession } from '../utils/activeSession';
import logoWarna from '../../assets/image/logo_warna.png';
import { ChevronLeft, ChevronRight, X, Monitor, MonitorDown, Play, Pause, RotateCcw, LayoutDashboard, Users, UserCheck, UserX, Clock, RefreshCw, ChevronDown } from 'lucide-react';
const GROUPS = Array.from({ length: 15 }, (_, i) => i + 1);

function getHeaders() {
  const token = localStorage.getItem('cai_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export const AdminFgdPresent: React.FC = () => {
  const { setCurrentPage, logout } = useApp();
  const [allData, setAllData] = useState<FgdMinute[]>([]);
  const [themes, setThemes] = useState<FgdTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNav, setShowNav] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string>('');
  const [attendance, setAttendance] = useState<DashboardData | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerResetKeyRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        setLoading(false);
        return;
      }
    } catch { }
    if (retries > 0) {
      setTimeout(() => fetchAll(retries - 1), 1000);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchFgdThemes().then(setThemes); }, []);

  const slides = [...allData].sort((a, b) =>
    a.groupNumber - b.groupNumber || a.sessionName.localeCompare(b.sessionName)
  );

  const current = slides[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < slides.length - 1;

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(Math.max(0, Math.min(idx, slides.length - 1)));
  }, [slides.length]);

  const goToPrev = useCallback(() => { if (canPrev) goTo(currentIndex - 1); }, [canPrev, currentIndex, goTo]);
  const goToNext = useCallback(() => { if (canNext) goTo(currentIndex + 1); }, [canNext, currentIndex, goTo]);

  // ── Timer presentasi (durasi per sesi diatur admin) ──
  const currentTheme = themes.find(t => t.name === current?.sessionName);
  const timerMinutes = currentTheme?.timerMinutes || 10;

  useEffect(() => {
    if (!current) return;
    const key = `${current.groupNumber}-${current.sessionName}|${timerMinutes}`;
    if (timerResetKeyRef.current === key) return;
    timerResetKeyRef.current = key;
    setTimerSeconds(timerMinutes * 60);
    setTimerRunning(false);
  }, [current, timerMinutes]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const toggleTimer = () => {
    if (timerSeconds <= 0) {
      setTimerSeconds(timerMinutes * 60);
      setTimerRunning(true);
    } else {
      setTimerRunning(r => !r);
    }
    showNavTemporarily();
  };

  const resetTimer = () => {
    setTimerSeconds(timerMinutes * 60);
    setTimerRunning(false);
    showNavTemporarily();
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const timerExpired = timerSeconds <= 0;
  const timerLow = !timerExpired && timerSeconds <= 60;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen();
      }
      showNavTemporarily();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToPrev, goToNext]);

  const showNavTemporarily = () => {
    setShowNav(true);
    if (navTimer.current) clearTimeout(navTimer.current);
    navTimer.current = setTimeout(() => setShowNav(false), 3000);
  };

  useEffect(() => {
    return () => { if (navTimer.current) clearTimeout(navTimer.current); };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Papan kehadiran per kelompok (live) ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sessions`, { headers: getHeaders() });
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setAttendanceSessions(Array.isArray(data) ? data : []);
        }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (!showAttendance) return;
    const load = async () => {
      setAttendanceLoading(true);
      try {
        const url = attendanceSessionId
          ? `${API_BASE_URL}/analytics/dashboard?sessionId=${encodeURIComponent(attendanceSessionId)}`
          : `${API_BASE_URL}/analytics/dashboard`;
        const res = await fetch(url, { headers: getHeaders() });
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.ok) {
          const data: DashboardData = await res.json();
          setAttendance(data);
        }
      } catch { } finally {
        setAttendanceLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 10000);
    return () => window.clearInterval(id);
  }, [showAttendance, attendanceSessionId]);

  const toggleAttendance = () => {
    showNavTemporarily();
    const next = !showAttendance;
    setShowAttendance(next);
    if (next && !attendanceSessionId && attendanceSessions.length > 0) {
      const detected = autoDetectActiveSession(attendanceSessions);
      setAttendanceSessionId(detected || attendanceSessions[attendanceSessions.length - 1].id);
    }
  };

  const groupSlides = GROUPS.flatMap(g => {
    const groupItems = slides.filter(s => s.groupNumber === g);
    if (groupItems.length === 0) return [];
    return groupItems;
  });

  const handleExit = () => setCurrentPage('admin-fgd');

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center justify-center gap-4 font-['Poppins']">
        <Monitor className="h-16 w-16 text-slate-300" />
        <p className="text-lg text-slate-500 font-medium">Belum ada data notulis yang tersedia</p>
        <button onClick={handleExit} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-white font-['Poppins'] overflow-hidden relative flex flex-col"
      onMouseMove={showNavTemporarily}
    >
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 sm:px-10 py-3 sm:py-4 flex items-center gap-4">
        <img src={logoWarna} alt="Logo CAI" className="h-10 sm:h-12 w-auto" />
        <div className="flex-1">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
            {showAttendance ? 'KEHADIRAN PESERTA' : 'HASIL FOCUS GROUP DISCUSSION (FGD)'}
          </h1>
          {showAttendance ? (
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              {attendance?.session
                ? `${attendance.session.dayName} · ${new Date(attendance.session.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · Jam Masuk ${attendance.session.startTime}`
                : 'Kehadiran peserta per kelompok (live)'}
            </p>
          ) : (
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Grup {current.groupNumber} — {fgdThemeLabelFor(themes, current.sessionName)}
              {current.authorName && <span className="ml-2 text-slate-400">| Notulis: {current.authorName}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {!showAttendance && (
            <>
              {/* Timer */}
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border transition-colors ${timerExpired ? 'bg-rose-600 text-white border-rose-700 animate-pulse' : timerLow ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-800 border-slate-300'}`}>
                <span className="hidden sm:block text-[10px] font-bold uppercase tracking-wide opacity-70">Timer</span>
                <span className="font-mono font-bold tabular-nums tracking-wider text-lg sm:text-2xl">
                  {fmtTime(timerSeconds)}
                </span>
                {timerExpired && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white">Waktu Habis</span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium whitespace-nowrap">
                {currentIndex + 1} / {slides.length}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-4 sm:py-6">
        {showAttendance ? (
          <div className="max-w-5xl mx-auto">
            {/* Pilihan sesi */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sesi:</span>
                <div className="relative">
                  <select
                    value={attendanceSessionId}
                    onChange={e => setAttendanceSessionId(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {attendanceSessions.length === 0 && <option value="">Belum ada sesi</option>}
                    {attendanceSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name || `Sesi ${s.sessionNumber}`} · {s.dayName} · {new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {s.startTime}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {attendanceLoading && (
                <span className="text-xs text-blue-500 font-semibold flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memperbarui data...
                </span>
              )}
            </div>

            {!attendance ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-sm font-medium">Belum ada data kehadiran untuk sesi ini.</p>
              </div>
            ) : (
              <>
                {/* Ringkasan */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <Kpi label="Total Peserta" value={attendance.summary.total} color="slate" />
                  <Kpi label="Hadir" value={attendance.summary.present} color="blue" />
                  <Kpi label="Absen" value={attendance.summary.absent} color="amber" />
                  <Kpi label="Terlambat" value={attendance.summary.lateCount} color="rose" />
                </div>

                {/* Kehadiran per kelompok */}
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> Kehadiran per Kelompok
                </h3>
                {attendance.groupStats.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">Belum ada data kelompok.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attendance.groupStats.map(gs => (
                      <div key={gs.group} className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-bold text-slate-800">{gs.group}</span>
                          {gs.late > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {gs.late} terlambat
                            </span>
                          )}
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                          {gs.present}<span className="text-sm font-semibold text-slate-400">/{gs.total}</span>
                        </div>
                        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${gs.percent > 75 ? 'bg-emerald-500' : gs.percent > 40 ? 'bg-blue-500' : 'bg-amber-400'}`}
                            style={{ width: `${gs.percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px] font-semibold text-slate-400">
                          <span>{gs.percent}% kehadiran</span>
                          <span>{gs.absent} absen</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">

          {/* USULAN PERMASALAHAN */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">USULAN PERMASALAHAN</div>
            <div className="px-4 py-3 text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
              {current.usulanPermasalahan || '-'}
            </div>
          </div>

          {/* PROBLEM - PENYEBAB - SOLUSI */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">PROBLEM - PENYEBAB - SOLUSI</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              {[
                { label: 'Problem', content: current.problem },
                { label: 'Penyebab', content: current.penyebab },
                { label: 'Solusi', content: current.solusi },
              ].map((c, i) => (
                <div key={i} className="p-4">
                  <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">{c.label}</div>
                  <div className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content || '-'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION PLAN */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">ACTION PLAN</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-x divide-slate-200">
              {[
                { label: 'Bidang PPG', content: current.actionPlanBidangPpg },
                { label: 'Deskripsi', content: current.actionPlanDeskripsi },
                { label: 'Nama Kegiatan', content: current.actionPlanNamaKegiatan },
                { label: 'Peserta', content: current.actionPlanPeserta },
                { label: 'Waktu', content: current.actionPlanWaktu },
                { label: 'Dana', content: current.actionPlanDana },
              ].map((item, i) => (
                <div key={i} className={`p-4 ${i >= 4 ? 'sm:border-b-0' : ''}`}>
                  <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">{item.label}</div>
                  <div className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content || '-'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PERAN 5 UNSUR */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm sm:text-base">PERAN 5 UNSUR</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-x divide-slate-200">
              {[
                { label: 'Peran Keimaman', content: current.peranKeimaman },
                { label: 'Peran Pengurus', content: current.peranPengurus },
                { label: 'Peran Orang Tua', content: current.peranOrangTua },
                { label: 'Peran Mubaligh', content: current.peranMubaligh },
                { label: 'Peran Ahli Pendidik', content: current.peranAhliPendidik },
              ].map((item, i) => (
                <div key={i} className={`p-4 ${i >= 3 ? 'sm:border-b-0' : ''}`}>
                  <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">{item.label}</div>
                  <div className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Floating Navigation */}
      <div className={`shrink-0 transition-opacity duration-300 ${showNav ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-slate-900/90 backdrop-blur-sm text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrev}
              disabled={!canPrev}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Sebelumnya (Panah Kiri)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <select
              value={currentIndex}
              onChange={e => goTo(parseInt(e.target.value))}
              className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 outline-none appearance-none cursor-pointer"
            >
              {slides.map((s, i) => (
                <option key={`${s.groupNumber}-${s.sessionName}`} value={i} className="text-slate-900 bg-white">
                  Grup {s.groupNumber} — {fgdThemeLabelFor(themes, s.sessionName)}
                </option>
              ))}
            </select>
            <button
              onClick={goToNext}
              disabled={!canNext}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Selanjutnya (Panah Kanan)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              title={timerRunning ? 'Jeda Timer' : 'Mulai Timer'}
            >
              {timerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={resetTimer}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={toggleAttendance}
              className={`p-2 rounded-lg transition-all ${showAttendance ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}
              title={showAttendance ? 'Kembali ke Slide FGD' : 'Tampilkan Kehadiran per Kelompok'}
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              {isFullscreen ? <MonitorDown className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </button>
            <button
              onClick={handleExit}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              title="Keluar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      {!showNav && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 bg-white/80 px-3 py-1 rounded-full shadow-sm">
          Gerakkan mouse atau tekan tombol panah untuk navigasi
        </div>
      )}
    </div>
  );
};

const Kpi: React.FC<{
  label: string;
  value: number;
  color: 'slate' | 'blue' | 'amber' | 'rose';
}> = ({ label, value, color }) => {
  const icons = {
    slate: <Users className="h-5 w-5" />,
    blue: <UserCheck className="h-5 w-5" />,
    amber: <UserX className="h-5 w-5" />,
    rose: <Clock className="h-5 w-5" />,
  };
  const colorMap = {
    slate: { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' },
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600', bar: 'bg-rose-500' },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold ${c.text} uppercase tracking-wider`}>{label}</span>
        <div className={`p-2 ${c.bg} border ${c.border} rounded-lg ${c.text}`}>{icons[color]}</div>
      </div>
      <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${c.bar}`} />
    </div>
  );
};
