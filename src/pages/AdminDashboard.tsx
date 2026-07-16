import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Percent, 
  MapPin, 
  TrendingUp, 
  Activity, 
  RefreshCw,
  Clock,
  VenusAndMars,
  Sparkles,
  Info
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { participants, checkInLogs, resetAllAttendance } = useApp();

  // Metrics calculations
  const total = participants.length;
  const checkedIn = participants.filter(p => p.isCheckedIn).length;
  const remaining = total - checkedIn;
  const attendanceRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Breakdown by Gender
  const maleTotal = participants.filter(p => p.gender === 'L').length;
  const maleCheckedIn = participants.filter(p => p.gender === 'L' && p.isCheckedIn).length;
  const femaleTotal = participants.filter(p => p.gender === 'P').length;
  const femaleCheckedIn = participants.filter(p => p.gender === 'P' && p.isCheckedIn).length;

  const malePercent = maleTotal > 0 ? Math.round((maleCheckedIn / maleTotal) * 100) : 0;
  const femalePercent = femaleTotal > 0 ? Math.round((femaleCheckedIn / femaleTotal) * 100) : 0;

  // Breakdown by Groups (Mountain themes + Panitia + Tamu)
  const groupsList = Array.from(new Set(participants.map(p => p.group)));
  const groupStats = groupsList.map(group => {
    const groupParticipants = participants.filter(p => p.group === group);
    const gTotal = groupParticipants.length;
    const gCheckedIn = groupParticipants.filter(p => p.isCheckedIn).length;
    const gPercent = gTotal > 0 ? Math.round((gCheckedIn / gTotal) * 100) : 0;
    return { group, total: gTotal, checkedIn: gCheckedIn, percent: gPercent };
  }).sort((a, b) => b.percent - a.percent);

  // Breakdown by Origin (Top cities)
  const originList = Array.from(new Set(participants.map(p => p.origin)));
  const originStats = originList.map(origin => {
    const originParticipants = participants.filter(p => p.origin === origin);
    const oTotal = originParticipants.length;
    const oCheckedIn = originParticipants.filter(p => p.isCheckedIn).length;
    return { origin, total: oTotal, checkedIn: oCheckedIn };
  }).sort((a, b) => b.checkedIn - a.checkedIn).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Banner & Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Dashboard Analytics & Real-Time Monitor
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau statistik kehadiran peserta Cinta Alam Indonesia secara real-time dan analisis per kelompok.
          </p>
        </div>

        {/* Sandbox Indicator */}
        <div className="flex gap-2">
          <button
            onClick={resetAllAttendance}
            className="px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            id="admin-reset-attendance-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Data Kehadiran
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Registered */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Terdaftar</span>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{total}</div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Seluruh peserta terdata di sistem</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200" />
        </div>

        {/* Card 2: Checked-In */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Hadir (Checked-In)</span>
            <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{checkedIn}</div>
          <p className="text-[10px] text-blue-500 mt-2 font-medium">Telah menyelesaikan registrasi barcode/manual</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Card 3: Absent/Remaining */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Belum Hadir (Absent)</span>
            <div className="p-2 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-600">
              <UserMinus className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 tracking-tight">{remaining}</div>
          <p className="text-[10px] text-amber-500 mt-2 font-medium">Dalam perjalanan atau belum melakukan scan</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider font-semibold">Persentase Kehadiran</span>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{attendanceRate}%</div>
          
          {/* Simple progress metric */}
          <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-500" 
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
        </div>
      </div>

      {/* Main Charts & Breakdown Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Group Statistics & Gender Analysis (7 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Attendance by Group */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kehadiran Berdasarkan Kelompok</h3>
                <p className="text-xs text-slate-500 mt-0.5">Urutan kehadiran tertinggi ke terendah</p>
              </div>
              <Sparkles className="h-4 w-4 text-blue-500" />
            </div>

            <div className="space-y-5">
              {groupStats.map(stat => (
                <div key={stat.group} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="font-bold text-slate-800">{stat.group}</span>
                    <span className="text-slate-500">
                      {stat.checkedIn} dari {stat.total} ({stat.percent}%)
                    </span>
                  </div>
                  
                  {/* Styled customized progress bar */}
                  <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.percent > 75 
                          ? 'bg-blue-650 bg-blue-600' 
                          : stat.percent > 40 
                          ? 'bg-blue-500' 
                          : 'bg-blue-400'
                      }`}
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Metrics Grid: Gender & Top Origin Cities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Gender analysis */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <VenusAndMars className="h-4 w-4 text-slate-500" />
                Rasio Gender Ter-absen
              </h3>

              <div className="flex-1 flex flex-col justify-center space-y-5">
                {/* Laki-laki */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                    <span className="text-slate-600">Laki-laki (L)</span>
                    <span className="font-bold text-slate-800">{maleCheckedIn} / {maleTotal} ({malePercent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 border border-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${malePercent}%` }}
                    />
                  </div>
                </div>

                {/* Perempuan */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                    <span className="text-slate-600">Perempuan (P)</span>
                    <span className="font-bold text-slate-800">{femaleCheckedIn} / {femaleTotal} ({femalePercent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 border border-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 rounded-full transition-all duration-500" 
                      style={{ width: `${femalePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Origin Cities */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Daerah Asal Ter-absen (Top 5)
              </h3>

              <div className="space-y-3.5">
                {originStats.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Belum ada peserta hadir.</p>
                ) : (
                  originStats.map((stat, idx) => (
                    <div key={stat.origin} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 rounded flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{stat.origin}</span>
                      </div>
                      <span className="text-slate-500 font-semibold">
                        {stat.checkedIn} / {stat.total} hadir
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Live Logs Feed & Info Panel (5 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Live Checkin logs activity feed */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Monitor Absensi Live
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {checkInLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada log aktivitas kehadiran.
                </div>
              ) : (
                checkInLogs.slice(0, 8).map((log, index) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 leading-tight block truncate max-w-[150px]">
                        {log.participantName}
                      </span>
                      <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-500 font-medium truncate">{log.group}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                        log.status === 'success' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {log.status === 'success' ? 'HADIR' : 'DOUBLE SCAN'}
                      </span>
                    </div>
                    
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <span>Scanned by:</span>
                      <span className="font-semibold text-slate-500">{log.operatorName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Informational Panel */}
          <div className="bg-blue-50/30 border border-blue-200/50 rounded-2xl p-5 flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Informasi Backup
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Sistem ini menyimpan data absensi di memori lokal peramban (Local Storage). Seluruh perubahan data peserta dan log aman dari refresh halaman.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
