import React, { useEffect, useState } from 'react';
import { FgdMinute, FgdTheme } from '../types';
import { useApp } from '../context/AppContext';
import { API_BASE_URL } from '../api';
import { fetchFgdThemes, fgdThemeLabelFor } from '../utils/fgdThemes';
import logoWarna from '../../assets/image/logo_warna.png';

function getHeaders() {
  const token = localStorage.getItem('cai_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export const AdminFgdPrint: React.FC = () => {
  const { setCurrentPage, logout } = useApp();
  const [allData, setAllData] = useState<FgdMinute[]>([]);
  const [themes, setThemes] = useState<FgdTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const groupFilter = sessionStorage.getItem('fgd_print_group');

  useEffect(() => { fetchFgdThemes().then(setThemes); }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async (retries = 2) => {
      try {
        const res = await fetch(`${API_BASE_URL}/notulis${groupFilter ? `?group=${groupFilter}` : ''}`, { headers: getHeaders() });
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.ok) {
          const data: FgdMinute[] = await res.json();
          if (cancelled) return;
          const sorted = (Array.isArray(data) ? data : [data]).sort((a, b) => a.groupNumber - b.groupNumber || a.sessionName.localeCompare(b.sessionName));
          setAllData(sorted);
          setLoading(false);
          return;
        }
      } catch { }
      if (retries > 0) {
        setTimeout(() => { if (!cancelled) load(retries - 1); }, 1000);
      } else if (!cancelled) {
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [groupFilter]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
      </div>
    );
  }

  if (allData.length === 0) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center justify-center gap-4 font-['Poppins']">
        <p className="text-lg text-slate-500 font-medium">Belum ada data notulis</p>
        <button onClick={() => setCurrentPage('admin-fgd')} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl">
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="font-['Poppins']">
      {/* Print Toolbar — hidden saat print */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={logoWarna} alt="Logo CAI" className="h-8 w-auto" />
          <span className="text-sm font-bold text-slate-700">Cetak Notulis FGD {groupFilter ? `— Grup ${groupFilter}` : ''} — {allData.length} data</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm active:scale-95">
            Cetak / Simpan PDF
          </button>
          <button onClick={() => { sessionStorage.removeItem('fgd_print_group'); setCurrentPage('admin-fgd'); }} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 active:scale-95">
            Kembali
          </button>
        </div>
      </div>

      {/* Konten Cetak */}
      <div className="print-container">
        {allData.map((d, idx) => (
          <div key={d.id} className="print-page">
            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <img src={logoWarna} alt="Logo CAI" className="h-14 w-auto" />
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  HASIL FOCUS GROUP DISCUSSION (FGD)
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Grup {d.groupNumber} — {fgdThemeLabelFor(themes, d.sessionName)}
                  {d.authorName && <span className="ml-2 text-slate-400">| Notulis: {d.authorName}</span>}
                </p>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {idx + 1}/{allData.length}
              </div>
            </div>

            {/* USULAN PERMASALAHAN */}
            <div className="card-block">
              <div className="card-header">USULAN PERMASALAHAN</div>
              <div className="card-body">
                {d.usulanPermasalahan || '-'}
              </div>
            </div>

            {/* PROBLEM - PENYEBAB - SOLUSI */}
            <div className="card-block">
              <div className="card-header">PROBLEM - PENYEBAB - SOLUSI</div>
              <div className="grid grid-cols-3 divide-x divide-slate-200">
                {[
                  { label: 'Problem', content: d.problem },
                  { label: 'Penyebab', content: d.penyebab },
                  { label: 'Solusi', content: d.solusi },
                ].map((c, i) => (
                  <div key={i} className="p-4">
                    <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">{c.label}</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content || '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION PLAN */}
            <div className="card-block">
              <div className="card-header">ACTION PLAN</div>
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                {[
                  { label: 'Bidang PPG', content: d.actionPlanBidangPpg },
                  { label: 'Deskripsi', content: d.actionPlanDeskripsi },
                  { label: 'Nama Kegiatan', content: d.actionPlanNamaKegiatan },
                  { label: 'Peserta', content: d.actionPlanPeserta },
                  { label: 'Waktu', content: d.actionPlanWaktu },
                  { label: 'Dana', content: d.actionPlanDana },
                ].map((item, i) => (
                  <div key={i} className={`p-4 ${i >= 4 ? 'border-b-0' : ''}`}>
                    <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">{item.label}</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content || '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PERAN 5 UNSUR */}
            <div className="card-block">
              <div className="card-header">PERAN 5 UNSUR</div>
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                {[
                  { label: 'Peran Keimaman', content: d.peranKeimaman },
                  { label: 'Peran Pengurus', content: d.peranPengurus },
                  { label: 'Peran Orang Tua', content: d.peranOrangTua },
                  { label: 'Peran Mubaligh', content: d.peranMubaligh },
                  { label: 'Peran Ahli Pendidik', content: d.peranAhliPendidik },
                ].map((item, i) => (
                  <div key={i} className={`p-4 ${i >= 3 ? 'border-b-0' : ''}`}>
                    <div className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wide">{item.label}</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content || '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-right text-[10px] text-slate-400 mt-3 italic">
              Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @page {
          size: A4 landscape;
          margin: 12mm 10mm;
        }
        @media print {
          body { 
            margin: 0; padding: 0; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .no-print { display: none !important; }
          .print-container { padding: 0; }
          .print-page {
            page-break-after: always;
            padding: 0;
          }
          .print-page:last-child { page-break-after: avoid; }
        }
        @media screen {
          body { background: #f1f5f9; margin: 0; padding: 0; }
          .no-print { display: flex; }
          .print-container { 
            padding: 80px 20px 20px; 
            max-width: 1200px; 
            margin: 0 auto; 
          }
          .print-page {
            background: white;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 24px 28px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
          }
        }
        .card-block {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .card-header {
          background: #2e32a3;
          color: white;
          font-weight: 700;
          padding: 8px 16px;
          font-size: 13px;
        }
        .card-body {
          padding: 12px 16px;
          font-size: 13px;
          color: #334155;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        .grid {
          display: grid;
        }
        .grid-cols-2 { grid-template-columns: 1fr 1fr; }
        .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
        .divide-x > * + * { border-left: 1px solid #e2e8f0; }
        .p-4 { padding: 12px 16px; }
        .border-b-0 { border-bottom: none; }
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; }
        .text-xl { font-size: 20px; }
        .font-bold { font-weight: 700; }
        .tracking-tight { letter-spacing: -0.02em; }
        .leading-tight { line-height: 1.25; }
        .whitespace-pre-wrap { white-space: pre-wrap; }
        .leading-relaxed { line-height: 1.6; }
        .uppercase { text-transform: uppercase; }
        .tracking-wide { letter-spacing: 0.05em; }
        .text-blue-700 { color: #242784; }
        .text-slate-400 { color: #94a3b8; }
        .text-slate-500 { color: #64748b; }
        .text-slate-700 { color: #334155; }
        .text-slate-800 { color: #1e293b; }
        .italic { font-style: italic; }
        .text-right { text-align: right; }
        .mt-3 { margin-top: 12px; }
        .mb-5 { margin-bottom: 20px; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-4 { gap: 16px; }
        .flex-1 { flex: 1; }
        .h-14 { height: 56px; }
        .w-auto { width: auto; }
        .ml-2 { margin-left: 8px; }
      `}</style>
    </div>
  );
};
