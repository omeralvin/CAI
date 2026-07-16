import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Participant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Filter, 
  Check, 
  X, 
  XCircle, 
  CheckCircle, 
  UserPlus,
  HelpCircle,
  Copy,
  Edit2
} from 'lucide-react';

export const AdminParticipants: React.FC = () => {
  const { participants, addParticipant, deleteParticipant, updateParticipant, importParticipants } = useApp();

  // Search and Filters States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Modal / Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // New Participant Form State
  const [newParticipant, setNewParticipant] = useState({
    id: '',
    name: '',
    gender: 'L' as 'L' | 'P',
    group: 'Kelompok Semeru',
    origin: '',
    rfidCardId: ''
  });
  const [addError, setAddError] = useState('');

  // Editing Participant Form State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Import Parser States
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<Omit<Participant, 'isCheckedIn'>[]>([]);
  const [importError, setImportError] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Sample CSV string for quick testing
  const SAMPLE_CSV = `CAI-2026-101,Rizky Pratama,L,Kelompok Semeru,Surabaya,58C3FA2C
CAI-2026-102,Dewi Lestari,P,Kelompok Bromo,Sidoarjo,8A9B10C2
CAI-2026-103,Bambang Pamungkas,L,Kelompok Rinjani,Malang,4E5F6D7B
CAI-2026-104,Siti Aminah,P,Kelompok Merbabu,Gresik,1D2E3F4A`;

  // Get unique groups for dropdown filter
  const groupsList = Array.from(new Set(participants.map(p => p.group)));

  // Filter participants
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.origin.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'present' 
      ? p.isCheckedIn 
      : !p.isCheckedIn;

    const matchesGroup = groupFilter === 'all'
      ? true
      : p.group === groupFilter;

    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Handle Add Participant Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newParticipant.id.trim()) {
      setAddError('ID Peserta wajib diisi!');
      return;
    }
    if (!newParticipant.name.trim()) {
      setAddError('Nama Peserta wajib diisi!');
      return;
    }
    if (!newParticipant.origin.trim()) {
      setAddError('Kota Asal wajib diisi!');
      return;
    }

    const formattedId = newParticipant.id.trim().toUpperCase();

    const success = await addParticipant({
      id: formattedId,
      name: newParticipant.name.trim(),
      gender: newParticipant.gender,
      group: newParticipant.group,
      origin: newParticipant.origin.trim(),
      rfidCardId: newParticipant.rfidCardId.trim() || null
    });

    if (success) {
      setIsAddOpen(false);
      // Reset form
      setNewParticipant({
        id: '',
        name: '',
        gender: 'L',
        group: 'Kelompok Semeru',
        origin: '',
        rfidCardId: ''
      });
    } else {
      setAddError(`ID Peserta "${formattedId}" sudah terdaftar di sistem!`);
    }
  };

  // Handle Edit Participant Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;

    if (!editingParticipant.name.trim() || !editingParticipant.origin.trim()) {
      return;
    }

    await updateParticipant({
      ...editingParticipant,
      name: editingParticipant.name.trim(),
      origin: editingParticipant.origin.trim()
    });
    
    setIsEditOpen(false);
    setEditingParticipant(null);
  };

  // Parsing pasted CSV string
  const handleParseCSV = () => {
    setImportError('');
    setImportPreview([]);
    setImportSuccessMsg('');

    if (!importText.trim()) {
      setImportError('Silakan tempel data teks CSV terlebih dahulu.');
      return;
    }

    const lines = importText.split('\n');
    const parsedList: Omit<Participant, 'isCheckedIn'>[] = [];
    let lineErrors = 0;

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return; // skip empty line

      const columns = cleanLine.split(',');
      if (columns.length >= 5) {
        const id = columns[0].trim().toUpperCase();
        const name = columns[1].trim();
        const genderRaw = columns[2].trim().toUpperCase();
        const group = columns[3].trim();
        const origin = columns[4].trim();
        const rfidCardId = columns[5] ? columns[5].trim().toUpperCase() : null;

        const gender = (genderRaw === 'P' || genderRaw === 'PEREMPUAN') ? 'P' : 'L';

        if (id && name && group && origin) {
          parsedList.push({ id, name, gender, group, origin, rfidCardId });
        } else {
          lineErrors++;
        }
      } else {
        lineErrors++;
      }
    });

    if (parsedList.length === 0) {
      setImportError('Format CSV tidak valid atau kolom kosong! Periksa contoh format.');
    } else {
      setImportPreview(parsedList);
      if (lineErrors > 0) {
        setImportError(`Ditemukan ${lineErrors} baris tidak valid yang akan dilewati.`);
      }
    }
  };

  // Execute Import Preview to Global Store
  const handleExecuteImport = async () => {
    if (importPreview.length === 0) return;

    const importedCount = await importParticipants(importPreview);
    const skippedCount = importPreview.length - importedCount;

    setImportSuccessMsg(`Berhasil mengimpor ${importedCount} peserta baru.`);
    if (skippedCount > 0) {
      setImportSuccessMsg(prev => `${prev} (${skippedCount} dilewati karena ID sudah terdaftar).`);
    }

    setImportPreview([]);
    setImportText('');
  };

  const copySampleToClipboard = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setImportSuccessMsg('Contoh teks CSV berhasil disalin ke papan klip!');
  };

  // Manual CheckIn state toggles inside the table
  const handleToggleCheckInManual = async (p: Participant) => {
    if (p.isCheckedIn) {
      await updateParticipant({
        ...p,
        isCheckedIn: false,
        checkInTime: null,
        scannedBy: null
      });
    } else {
      await updateParticipant({
        ...p,
        isCheckedIn: true,
        checkInTime: new Date().toISOString(),
        scannedBy: "Admin (Manual)"
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Panel */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Manajemen Data Peserta CAI
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tambah peserta individu, hapus, kelola status kehadiran, atau import data massal lewat CSV.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            id="import-csv-btn"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            Import CSV
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-700/10 cursor-pointer"
            id="add-participant-btn"
          >
            <Plus className="h-4 w-4" />
            Tambah Peserta
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Cari berdasarkan ID, nama, atau kota asal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Semua Kehadiran</option>
            <option value="present">Hadir</option>
            <option value="absent">Belum Hadir</option>
          </select>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Semua Kelompok</option>
            {groupsList.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/80">
            <thead className="bg-slate-50/75">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">ID Peserta</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gender</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">RFID Card</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kelompok</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asal Daerah</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Absensi</th>
                <th scope="col" className="px-6 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Tidak ada data peserta ditemukan yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* ID */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-xs text-slate-800">
                      {p.id}
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {p.name}
                    </td>

                    {/* Gender badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold leading-none ${
                        p.gender === 'L' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-pink-50 text-pink-700 border border-pink-100'
                      }`}>
                        {p.gender === 'L' ? 'LAKI-LAKI (L)' : 'PEREMPUAN (P)'}
                      </span>
                    </td>

                    {/* RFID Card */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                      {p.rfidCardId ? (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50/50 text-blue-700 border border-blue-100/50 px-2.5 py-1 rounded-lg font-mono font-bold">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                          </span>
                          {p.rfidCardId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum di-set</span>
                      )}
                    </td>

                    {/* Group */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                      {p.group}
                    </td>

                    {/* Origin */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                      {p.origin}
                    </td>

                    {/* Check In status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.isCheckedIn ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100 self-start">
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                            HADIR
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 font-medium font-mono">
                            {p.checkInTime ? new Date(p.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} • {p.scannedBy || 'System'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircle className="h-3 w-3 text-slate-400" />
                          BELUM HADIR
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium">
                      <div className="flex items-center justify-center gap-2">
                        {/* Manual toggle attendance */}
                        <button
                          onClick={() => handleToggleCheckInManual(p)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                            p.isCheckedIn 
                              ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                              : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800'
                          }`}
                          title={p.isCheckedIn ? "Batalkan Absensi" : "Verifikasi Hadir Manual"}
                        >
                          {p.isCheckedIn ? "Undo" : "Hadir"}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                              setEditingParticipant(p);
                              setIsEditOpen(true);
                          }}
                          className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Ubah Data"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={async () => {
                            if (confirm(`Apakah Anda yakin ingin menghapus peserta "${p.name}"?`)) {
                              await deleteParticipant(p.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD INDIVIDUAL PARTICIPANT */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-blue-600" />
                  Tambah Peserta Baru
                </h3>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                {addError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                    {addError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ID Registrasi Peserta</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: CAI-2026-016"
                    value={newParticipant.id}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Rafli"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewParticipant(prev => ({ ...prev, gender: 'L' }))}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        newParticipant.gender === 'L'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      Laki-laki (L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewParticipant(prev => ({ ...prev, gender: 'P' }))}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        newParticipant.gender === 'P'
                          ? 'bg-pink-50 border-pink-400 text-pink-900 ring-1 ring-pink-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      Perempuan (P)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kelompok Kegiatan</label>
                  <select
                    value={newParticipant.group}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, group: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold bg-white"
                  >
                    <option value="Kelompok Semeru bg-white">Kelompok Semeru</option>
                    <option value="Kelompok Rinjani bg-white">Kelompok Rinjani</option>
                    <option value="Kelompok Merbabu bg-white">Kelompok Merbabu</option>
                    <option value="Kelompok Bromo bg-white">Kelompok Bromo</option>
                    <option value="Panitia bg-white">Panitia</option>
                    <option value="Tamu Undangan bg-white">Tamu Undangan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kota / Daerah Asal</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nganjuk"
                    value={newParticipant.origin}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, origin: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                    <span>Serial Kartu RFID (Opsional)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const randomHex = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
                        setNewParticipant(prev => ({ ...prev, rfidCardId: randomHex }));
                      }}
                      className="text-[10px] text-blue-600 hover:underline hover:text-blue-500 font-bold"
                    >
                      Generate Serial
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 58C3FA2C"
                    value={newParticipant.rfidCardId}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, rfidCardId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 uppercase font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Simpan Peserta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT PARTICIPANT */}
      <AnimatePresence>
        {isEditOpen && editingParticipant && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit2 className="h-4.5 w-4.5 text-blue-600" />
                  Ubah Data Peserta ({editingParticipant.id})
                </h3>
                <button
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingParticipant(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={editingParticipant.name}
                    onChange={(e) => setEditingParticipant(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingParticipant(prev => prev ? ({ ...prev, gender: 'L' }) : null)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editingParticipant.gender === 'L'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      Laki-laki (L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingParticipant(prev => prev ? ({ ...prev, gender: 'P' }) : null)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editingParticipant.gender === 'P'
                          ? 'bg-pink-50 border-pink-400 text-pink-900 ring-1 ring-pink-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      Perempuan (P)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kelompok</label>
                  <select
                    value={editingParticipant.group}
                    onChange={(e) => setEditingParticipant(prev => prev ? ({ ...prev, group: e.target.value }) : null)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  >
                    <option value="Kelompok Semeru bg-white">Kelompok Semeru</option>
                    <option value="Kelompok Rinjani bg-white">Kelompok Rinjani</option>
                    <option value="Kelompok Merbabu bg-white">Kelompok Merbabu</option>
                    <option value="Kelompok Bromo bg-white">Kelompok Bromo</option>
                    <option value="Panitia bg-white">Panitia</option>
                    <option value="Tamu Undangan bg-white">Tamu Undangan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kota Asal</label>
                  <input
                    type="text"
                    required
                    value={editingParticipant.origin}
                    onChange={(e) => setEditingParticipant(prev => prev ? ({ ...prev, origin: e.target.value }) : null)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                    <span>Serial Kartu RFID (Opsional)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const randomHex = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
                        setEditingParticipant(prev => prev ? ({ ...prev, rfidCardId: randomHex }) : null);
                      }}
                      className="text-[10px] text-blue-600 hover:underline hover:text-blue-500 font-bold"
                    >
                      Generate Serial
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 58C3FA2C"
                    value={editingParticipant.rfidCardId || ''}
                    onChange={(e) => setEditingParticipant(prev => prev ? ({ ...prev, rfidCardId: e.target.value }) : null)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 uppercase font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditingParticipant(null);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: IMPORT CSV MASSAL */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Upload className="h-4.5 w-4.5 text-blue-600" />
                  Import Peserta Massal (CSV Parser)
                </h3>
                <button
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportText('');
                    setImportPreview([]);
                    setImportError('');
                    setImportSuccessMsg('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Info and Help */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900">
                  <p className="font-bold flex items-center gap-1.5 mb-1.5 text-slate-900">
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    Panduan Format Impor Teks Comma-Separated (CSV)
                  </p>
                  <p className="leading-relaxed mb-3 text-slate-600 font-medium">
                    Tempel data baris baru dengan struktur kolom dipisahkan koma berikut (kolom ke-6 RFID opsional):<br />
                    <code className="font-bold font-mono bg-blue-100/75 px-1 py-0.5 rounded text-blue-950">
                      ID_PESERTA,NAMA_LENGKAP,GENDER(L/P),KELOMPOK,KOTA_ASAL,RFID_CARD(Opsional)
                    </code>
                  </p>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-200 font-mono text-[10px] text-slate-600 relative">
                    <span className="absolute top-2 right-2 text-[9px] font-bold text-blue-600 uppercase">Salin untuk Demo</span>
                    <button
                      onClick={copySampleToClipboard}
                      className="absolute top-2 right-2 opacity-0 hover:opacity-100 focus:opacity-100 inset-0 w-full h-full cursor-pointer text-left pl-4 font-sans text-xs bg-transparent"
                      title="Salin Contoh"
                    />
                    <pre className="overflow-x-auto whitespace-pre">{SAMPLE_CSV}</pre>
                  </div>
                </div>

                {importError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                    {importError}
                  </div>
                )}

                {importSuccessMsg && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    {importSuccessMsg}
                  </div>
                )}

                {/* Main CSV Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tempel Data CSV</label>
                  <textarea
                    rows={5}
                    placeholder="Contoh: CAI-2026-101,Rizky Pratama,L,Kelompok Semeru,Surabaya,58C3FA2C"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 text-slate-900"
                  />
                </div>

                {/* Action Row */}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleParseCSV}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Proses CSV & Tampilkan Preview
                  </button>
                  
                  {importPreview.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Impor {importPreview.length} Peserta ke Sistem
                    </button>
                  )}
                </div>

                {/* Import Preview Table */}
                {importPreview.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-[10px] text-slate-500 uppercase">
                      Pratinjau Data yang Siap Diimpor
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left text-slate-600">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-2">ID</th>
                            <th className="p-2">Nama</th>
                            <th className="p-2">Gender</th>
                            <th className="p-2">RFID Card</th>
                            <th className="p-2">Kelompok</th>
                            <th className="p-2">Asal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {importPreview.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-slate-800">{item.id}</td>
                              <td className="p-2 font-bold text-slate-900">{item.name}</td>
                              <td className="p-2">{item.gender}</td>
                              <td className="p-2 font-mono text-blue-700 font-bold">{item.rfidCardId || '-'}</td>
                              <td className="p-2">{item.group}</td>
                              <td className="p-2">{item.origin}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportText('');
                    setImportPreview([]);
                    setImportError('');
                    setImportSuccessMsg('');
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer bg-white"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
