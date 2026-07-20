import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Participant, CheckInLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2, 
  UserX,
  History,
  Activity,
  UserPlus,
  CreditCard,
  Radio,
  Wifi
} from 'lucide-react';



export const OperatorCheckIn: React.FC = () => {
  const { participants, checkInParticipant, checkInByRfid, currentUser, checkInLogs } = useApp();
  const [activeTab, setActiveTab] = useState<'qr' | 'rfid'>('rfid');
  const [searchQuery, setSearchQuery] = useState('');
  const [idInput, setIdInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [rfidInput, setRfidInput] = useState('');
  const [rfidStatus, setRfidStatus] = useState<'idle' | 'scanning' | 'success' | 'warn' | 'error'>('idle');
  const [flashMessage, setFlashMessage] = useState<{
    type: 'success' | 'warn' | 'error';
    text: string;
    participant?: Participant;
  } | null>(null);

  const scannerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus hidden RFID input when RFID tab is active
  const focusRfidInput = useCallback(() => {
    if (activeTab === 'rfid' && hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'rfid') return;

    focusRfidInput();

    const handleGlobalClick = () => {
      setTimeout(focusRfidInput, 100);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [activeTab, focusRfidInput]);

  // Filter participants for manual autocomplete search (only show unchecked ones)
  const filteredParticipants = searchQuery.trim() === ''
    ? []
    : participants.filter(p => 
        !p.isCheckedIn && 
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.group.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5);

  const handleManualCheckIn = async (participantId: string) => {
    if (!currentUser) return;
    
    const res = await checkInParticipant(participantId, currentUser.name);
    
    if (res.success) {
      setFlashMessage({
        type: 'success',
        text: res.message,
        participant: res.participant
      });
      setSearchQuery('');
      setIdInput('');
      setShowDropdown(false);
    } else {
      setFlashMessage({
        type: res.participant?.isCheckedIn ? 'warn' : 'error',
        text: res.message,
        participant: res.participant
      });
    }

    // Auto dismiss flash after 4 seconds
    setTimeout(() => {
      setFlashMessage(prev => prev?.participant?.id === res.participant?.id || !res.participant ? null : prev);
    }, 4000);
  };

  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) return;
    handleManualCheckIn(idInput.trim());
  };

  // Simulate scanning a random QR code from remaining unchecked participants
  const handleSimulateScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setFlashMessage(null);

    // Filter unchecked participants
    const remaining = participants.filter(p => !p.isCheckedIn);

    setTimeout(() => {
      setIsScanning(false);
      
      if (remaining.length === 0) {
        setFlashMessage({
          type: 'error',
          text: 'Semua peserta sudah melakukan absensi!'
        });
        return;
      }

      // Pick a random participant
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const chosenParticipant = remaining[randomIndex];
      
      handleManualCheckIn(chosenParticipant.id);
    }, 1800); // simulated scan delay
  };

  const handleRfidTap = async (rfidCard: string) => {
    if (!currentUser || rfidStatus === 'scanning') return;
    
    setRfidStatus('scanning');
    setFlashMessage(null);

    const res = await checkInByRfid(rfidCard, currentUser.name);
    
    if (res.success) {
      setRfidStatus('success');
      setFlashMessage({
        type: 'success',
        text: res.message,
        participant: res.participant
      });
    } else {
      // Check if it's already checked in (warn) or not found (error)
      const isDoubleCheckIn = participants.some(p => p.rfidCardId?.toUpperCase() === rfidCard.toUpperCase() && p.isCheckedIn);
      setRfidStatus(isDoubleCheckIn ? 'warn' : 'error');
      setFlashMessage({
        type: isDoubleCheckIn ? 'warn' : 'error',
        text: res.message,
        participant: res.participant
      });
    }

    // Restore rfidStatus to idle after 3 seconds
    setTimeout(() => {
      setRfidStatus('idle');
    }, 3000);
  };

  const handleRfidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfidInput.trim()) return;
    handleRfidTap(rfidInput.trim());
    setRfidInput('');
  };

  // Calculate quick stats for the operator screen
  const total = participants.length;
  const checkedIn = participants.filter(p => p.isCheckedIn).length;
  const percent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Filter logs only for this operator's shift, or show top recent 6
  const displayLogs = checkInLogs.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="h-6 w-6 text-blue-600" />
            Real-time Check-In Lapangan
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gunakan kamera simulator, scan QR Code, atau cari peserta secara manual untuk melakukan absensi kehadiran.
          </p>
        </div>
        
        {/* Dynamic Operator Badge */}
        <div className="self-start md:self-center bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-xs text-slate-500 font-medium">Sesi Aktif:</span>
          <span className="text-xs font-bold text-slate-800">{currentUser?.name}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Scanner and Input (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button
                type="button"
                onClick={() => {
                  setActiveTab('rfid');
                  setFlashMessage(null);
                }}
                className={`flex-1 py-3.5 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'rfid'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                RFID Tap-In Reader
              </button>
              {/* Interactive Simulation Panel (QR Scanner & RFID Reader) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qr');
                  setFlashMessage(null);
                }}
                className={`flex-1 py-3.5 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'qr'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <QrCode className="h-4 w-4" />
                QR / Barcode Scanner
              </button>
              
            </div>

            {activeTab === 'qr' ? (
              <div className="p-6 flex flex-col items-center justify-center bg-slate-950 relative aspect-video sm:aspect-[21/9] lg:aspect-video rounded-b-2xl overflow-hidden">
                {/* Camera view screen simulation */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Scan box targeting */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-blue-500/50 rounded-2xl relative flex items-center justify-center bg-blue-950/10 shadow-[0_0_50px_rgba(37,99,235,0.15)] overflow-hidden">
                  {/* Hologram Corners */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                  {/* Laser scan bar */}
                  <motion.div 
                    animate={{
                      top: ["4%", "96%", "4%"]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute left-[4%] right-[4%] h-0.5 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,1)] z-10"
                  />

                  {isScanning ? (
                    <div className="text-center p-4 z-20">
                      <Activity className="h-10 w-10 text-blue-400 animate-pulse mx-auto mb-2" />
                      <span className="text-xs font-mono font-bold text-blue-400 tracking-widest uppercase block animate-bounce">
                        Membaca QR...
                      </span>
                    </div>
                  ) : (
                    <div className="text-center p-4 z-20">
                      <QrCode className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                        Arahkan Kamera
                      </span>
                    </div>
                  )}
                </div>

                {/* Control triggers */}
                {/* <div className="absolute bottom-4 left-4 right-4 flex justify-center z-20">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    disabled={isScanning}
                    className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer ${
                      isScanning
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-950/20'
                    }`}
                    id="simulate-scan-btn"
                  >
                    <QrCode className="h-4 w-4" />
                    {isScanning ? 'Mencari QR Peserta...' : 'Simulasikan Scan QR'}
                  </button>
                </div> */}
              </div>
            ) : (
              /* RFID Simulator Panel */
              <div className="p-6 bg-slate-900 flex flex-col md:flex-row gap-6 items-stretch rounded-b-2xl">
                
                {/* Physical Reader Device Simulation */}
                <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-5 border border-slate-800 rounded-2xl bg-slate-950 shadow-inner relative overflow-hidden">
                  <div className="absolute top-2.5 right-2.5 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                  </div>

                  <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                    CAI-RFID MATRIX v2.0
                  </span>

                  {/* Visual LED Status Indicator */}
                  <div className="flex flex-col items-center gap-2 mb-5 w-full">
                    <div className="flex items-center justify-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800/80 w-fit">
                      <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                        rfidStatus === 'scanning' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-pulse' :
                        rfidStatus === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' :
                        rfidStatus === 'warn' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' :
                        rfidStatus === 'error' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' :
                        'bg-blue-500 shadow-[0_0_10px_#3b82f6]'
                      }`} />
                      <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-slate-400">
                        {rfidStatus === 'scanning' ? 'MEMPROSES KARTU...' :
                         rfidStatus === 'success' ? 'AKSES DITERIMA!' :
                         rfidStatus === 'warn' ? 'WARNING: DOUBLE!' :
                         rfidStatus === 'error' ? 'KARTU TIDAK DIKENAL' :
                         'SIAP • TEMPEL KARTU'}
                      </span>
                    </div>
                  </div>

                  {/* Contactless tap area */}
                  <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    rfidStatus === 'scanning' ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-105' :
                    rfidStatus === 'success' ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-105' :
                    rfidStatus === 'warn' ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-105' :
                    rfidStatus === 'error' ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)] scale-105' :
                    'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50'
                  }`}>
                    {rfidStatus === 'scanning' ? (
                      <Wifi className="h-10 w-10 text-amber-500 animate-pulse" />
                    ) : rfidStatus === 'success' ? (
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    ) : rfidStatus === 'error' ? (
                      <AlertTriangle className="h-10 w-10 text-rose-500" />
                    ) : rfidStatus === 'warn' ? (
                      <AlertTriangle className="h-10 w-10 text-amber-500" />
                    ) : (
                      <Radio className="h-10 w-10 text-blue-500 animate-pulse" />
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 mt-4 text-center font-semibold max-w-[200px]">
                    Dekatkan kartu peserta yang terdaftar di panel kanan untuk proses absensi instan.
                  </p>
                </div>

                {/* RFID Controls / Interactive Simulation Deck */}
                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">

                  {/* Hidden form for hardware RFID Keyboard Emulator */}
                  <form onSubmit={handleRfidSubmit} className="opacity-0 absolute w-0 h-0 pointer-events-none overflow-hidden">
                    <input
                      ref={hiddenInputRef}
                      type="text"
                      autoFocus
                      value={rfidInput}
                      onChange={(e) => setRfidInput(e.target.value)}
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                  </form>

                  {/* Emergency Manual Serial Entry */}
                  <form onSubmit={handleRfidSubmit} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Input Manual Darurat (jika alat bermasalah)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: 58C3FA2C"
                        value={rfidInput}
                        onChange={(e) => setRfidInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono"
                      />
                      <button
                        type="submit"
                        disabled={rfidStatus === 'scanning' || !rfidInput.trim()}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        Tap
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}
          </div>

          {/* Manual Input Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Pencarian & Registrasi Manual
            </h3>

            <div className="space-y-4">
              {/* Form Input ID */}
              <form onSubmit={handleIdSubmit} className="flex gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ketik ID Peserta (Contoh: CAI-2026-003)"
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  id="submit-id-btn"
                >
                  Absen ID
                </button>
              </form>

              {/* Autocomplete Search Bar */}
              <div className="relative">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Atau Cari Berdasarkan Nama / Kelompok
                </span>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ketik nama peserta..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Dropdown search results */}
                <AnimatePresence>
                  {showDropdown && filteredParticipants.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-slate-200/80 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100"
                    >
                      {filteredParticipants.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleManualCheckIn(p.id)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{p.id}</span>
                              <span>•</span>
                              <span>{p.group}</span>
                              <span>•</span>
                              <span>{p.origin}</span>
                            </div>
                          </div>
                          <UserCheck className="h-4 w-4 text-blue-600" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                  {showDropdown && searchQuery.trim() !== '' && filteredParticipants.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-slate-200/80 rounded-xl shadow-lg p-4 text-center text-xs text-slate-500 flex flex-col items-center"
                    >
                      <UserX className="h-5 w-5 text-slate-400 mb-1" />
                      Tidak ada peserta belum absen yang cocok
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Toast notifications & Recent Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Stats Progress widget */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kehadiran Masuk
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50/60 px-2.5 py-1 rounded-full border border-blue-100/50">
                {percent}% Selesai
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{checkedIn}</span>
              <span className="text-sm text-slate-400">dari {total} Peserta</span>
            </div>
            
            {/* ProgressBar */}
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Flash Message Banner */}
          <AnimatePresence mode="wait">
            {flashMessage && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`p-5 rounded-2xl border flex gap-4 ${
                  flashMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm shadow-emerald-600/5'
                    : flashMessage.type === 'warn'
                    ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm shadow-amber-600/5'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {flashMessage.type === 'success' ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : flashMessage.type === 'warn' ? (
                  <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                    {flashMessage.type === 'success' ? 'Absensi Terdaftar' : flashMessage.type === 'warn' ? 'Sudah Absen' : 'Scan Gagal'}
                  </h4>
                  <p className="text-xs leading-relaxed font-semibold">{flashMessage.text}</p>
                  
                  {flashMessage.participant && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/40 divide-y divide-slate-200/20 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID Peserta</span>
                        <span className="font-mono font-bold text-slate-800">{flashMessage.participant.id}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Kelompok</span>
                        <span className="font-bold text-slate-800">{flashMessage.participant.group}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Daerah Asal</span>
                        <span className="font-bold text-slate-800">{flashMessage.participant.origin}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Activity Logs */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                Aktivitas Terakhir Sesi Ini
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {displayLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada log absensi terdaftar hari ini.
                </div>
              ) : (
                displayLogs.map(log => (
                  <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                    {log.status === 'success' ? (
                      <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{log.participantName}</span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                          {log.participantId}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                          {log.group}
                        </span>
                      </div>

                      {log.status !== 'success' && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 leading-none">
                          Sudah Absen Sebelumnya
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
