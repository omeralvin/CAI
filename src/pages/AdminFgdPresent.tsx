import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FgdMinute, FgdTheme } from '../types';
import { useApp } from '../context/AppContext';
import { API_BASE_URL } from '../api';
import { fetchFgdThemes, fgdThemeLabelFor } from '../utils/fgdThemes';
import logoWarna from '../../assets/image/logo_warna.png';
import { ChevronLeft, ChevronRight, X, Monitor, MonitorDown } from 'lucide-react';
const GROUPS = Array.from({ length: 15 }, (_, i) => i + 1);

function getHeaders() {
  const token = localStorage.getItem('cai_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export const AdminFgdPresent: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [allData, setAllData] = useState<FgdMinute[]>([]);
  const [themes, setThemes] = useState<FgdTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNav, setShowNav] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => { fetchFgdThemes().then(setThemes); }, []);

  const slides = allData.sort((a, b) =>
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
            HASIL FOCUS GROUP DISCUSSION (FGD)
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Grup {current.groupNumber} — {fgdThemeLabelFor(themes, current.sessionName)}
            {current.authorName && <span className="ml-2 text-slate-400">| Notulis: {current.authorName}</span>}
          </p>
        </div>
        <div className="text-xs sm:text-sm text-slate-400 font-medium whitespace-nowrap">
          {currentIndex + 1} / {slides.length}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-4 sm:py-6">
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
