import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Participant, CheckInLog } from '../types';
import { getParticipantCategory, CATEGORY_LABEL } from '../utils/participantCategory';
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
  Edit2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Clock,
  Calendar,
  ClipboardList,
  AlertTriangle,
  BadgeCheck,
  Wifi,
  Zap,
  SkipForward,
  Volume2,
} from 'lucide-react';

const SAMPLE_CSV = `Rizky Pratama,25,L,Desa Karangrejo,KI Desa
Dewi Lestari,28,P,Desa Sumbermulyo,MT Desa
Bambang Pamungkas,30,L,Desa Tegalrejo,Panitia
Siti Aminah,24,P,Desa Wonorejo,KI Desa`;

/** Normalisasi teks untuk pembandingan data yang "sama persis". */
const normalizeKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Kunci identitas unik satu baris data = Nama + Kelompok + Keterangan. */
const dupKey = (p: { name: string; group: string; origin: string }) =>
  `${normalizeKey(p.name)}|${normalizeKey(p.group)}|${normalizeKey(p.origin)}`;

/** Parser CSV sederhana yang mendukung tanda kutip (RFC 4180), CRLF, dan BOM. */
function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

const HEADER_HINTS = ['nama', 'name', 'n', 'umur', 'age', 'gender', 'jk', 'jenis kelamin', 'kelompok', 'group', 'desa', 'keterangan', 'origin', 'asal', 'rfid', 'id'];

function isHeaderRow(fields: string[]): boolean {
  if (fields.length === 0 || !fields[0]) return false;
  const first = normalizeKey(fields[0]);
  const second = normalizeKey(fields[1] || '');
  if (first.includes('nama') || first.includes('name') || first === 'n') return true;
  if (second === 'umur' || second === 'age') return true;
  return fields.some(f => HEADER_HINTS.includes(normalizeKey(f))) && fields.length >= 5;
}

interface ImportPreviewItem {
  id: string; name: string; age: number | null; gender: 'L' | 'P';
  group: string; origin: string;
  status: 'new' | 'dup-file' | 'exists';
}

function SortIcon({ dir }: { dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex ml-1 align-middle">
      {dir === 'asc' ? (
        <ChevronUp className="h-3 w-3 text-blue-600" />
      ) : (
        <ChevronDown className="h-3 w-3 text-blue-600" />
      )}
    </span>
  );
}

export const AdminParticipants: React.FC = () => {
  const {
    participants,
    checkInLogs,
    sessions,
    fetchSessions,
    addParticipant,
    deleteParticipant,
    updateParticipant,
    importParticipants,
    registerRfid,
    resetAllAttendance,
  } = useApp();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'peserta' | 'panitia'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [recapParticipant, setRecapParticipant] = useState<Participant | null>(null);

  const [newParticipant, setNewParticipant] = useState({
    id: '',
    name: '',
    age: '',
    gender: 'L' as 'L' | 'P',
    group: '',
    origin: '',
    rfidCardId: '',
  });
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [importError, setImportError] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [importWarnMsg, setImportWarnMsg] = useState('');
  const [importSaving, setImportSaving] = useState(false);

  const [isOtsRfidOpen, setIsOtsRfidOpen] = useState(false);
  const [otsSearchQuery, setOtsSearchQuery] = useState('');
  const [otsSelectedParticipant, setOtsSelectedParticipant] = useState<Participant | null>(null);
  const otsRfidInputRef = useRef<HTMLInputElement>(null);
  const [otsRfidValue, setOtsRfidValue] = useState('');
  const [otsMessage, setOtsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isMassPairOpen, setIsMassPairOpen] = useState(false);
  const [massPairIndex, setMassPairIndex] = useState(0);
  const massPairInputRef = useRef<HTMLInputElement>(null);
  const [massPairMessage, setMassPairMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [massPairDone, setMassPairDone] = useState(false);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetConfirmValue, setResetConfirmValue] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchDeleteStatus, setBatchDeleteStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Participant | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (participants.length > 0 || checkInLogs.length > 0) {
      const timer = setTimeout(() => setIsDataLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [participants, checkInLogs]);

  const handleSort = (field: keyof Participant) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const dayCmp = a.date.localeCompare(b.date);
        return dayCmp !== 0 ? dayCmp : a.sessionNumber - b.sessionNumber;
      }),
    [sessions],
  );

  const selectedSession = useMemo(
    () => sortedSessions.find((s) => s.id === selectedSessionId) || null,
    [sortedSessions, selectedSessionId],
  );

  const getSessionStatus = (participantId: string, sessionId: string) => {
    const log = checkInLogs.find(
      (l) => l.participantId === participantId && l.sessionId === sessionId && (l.status === 'PRESENT' || l.status === 'LATE'),
    );
    if (!log) return { status: 'Tidak Hadir' as const, detail: '-' };
    if (log.isLate) {
      const mins = log.lateDuration ?? 0;
      return { status: 'Terlambat' as const, detail: `Terlambat ${mins} Mnt` };
    }
    return { status: 'Hadir' as const, detail: 'Tepat Waktu' };
  };

  const groupsList = useMemo(() => Array.from(new Set(participants.map((p) => p.group))), [participants]);

  const pesertaList = useMemo(() => participants.filter(p => getParticipantCategory(p.origin) === 'PESERTA'), [participants]);
  const panitiaList = useMemo(() => participants.filter(p => getParticipantCategory(p.origin) === 'PANITIA'), [participants]);
  const pesertaCount = pesertaList.length;
  const panitiaCount = panitiaList.length;

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return participants.filter((p) => {
      const name = p.name || '';
      const id = p.id || '';
      const origin = p.origin || '';
      const group = p.group || '';
      const matchSearch =
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        group.toLowerCase().includes(q) ||
        origin.toLowerCase().includes(q);
      const isPresentInSelectedSession =
        selectedSessionId !== ''
          ? getSessionStatus(p.id, selectedSessionId).status !== 'Tidak Hadir'
          : p.isCheckedIn;
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'present'
          ? isPresentInSelectedSession
          : !isPresentInSelectedSession;
      const matchGroup = groupFilter === 'all' ? true : p.group === groupFilter;
      const matchCategory =
        categoryFilter === 'all'
          ? true
          : categoryFilter === 'peserta'
          ? getParticipantCategory(p.origin) === 'PESERTA'
          : getParticipantCategory(p.origin) === 'PANITIA';
      return matchSearch && matchStatus && matchGroup && matchCategory;
    });
  }, [participants, searchQuery, statusFilter, groupFilter, categoryFilter, selectedSessionId, checkInLogs]);

  const sortedParticipants = useMemo(() => {
    if (!sortField) return filteredParticipants;
    return [...filteredParticipants].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), 'id', { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredParticipants, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedParticipants.length / pageSize));
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedParticipants.slice(start, start + pageSize);
  }, [sortedParticipants, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const allFilteredIds = useMemo(() => filteredParticipants.map(p => p.id), [filteredParticipants]);

  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const generateNextId = useCallback(() => {
    const year = new Date().getFullYear().toString();
    let maxNum = 0;
    participants.forEach(p => {
      const match = p.id.match(/^CAI-(\d{4})-(\d+)$/);
      if (match && match[1] === year) {
        const num = parseInt(match[2], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `CAI-${year}-${String(maxNum + 1).padStart(3, '0')}`;
  }, [participants]);

  const autoId = generateNextId();

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newParticipant.name.trim()) {
      setAddError('Nama Peserta wajib diisi!');
      return;
    }
    if (!newParticipant.origin.trim()) {
      setAddError('Keterangan wajib diisi!');
      return;
    }
    setAddSaving(true);
    const formattedId = generateNextId();
    const ageVal = newParticipant.age.trim() ? parseInt(newParticipant.age.trim(), 10) : null;
    const success = await addParticipant({
      id: formattedId,
      name: newParticipant.name.trim(),
      age: isNaN(ageVal as number) ? null : ageVal,
      gender: newParticipant.gender,
      group: newParticipant.group,
      origin: newParticipant.origin.trim(),
      rfidCardId: newParticipant.rfidCardId.trim().toUpperCase() || null,
    });
    setAddSaving(false);
    if (success) {
      setIsAddOpen(false);
      setNewParticipant({ id: '', name: '', age: '', gender: 'L', group: '', origin: '', rfidCardId: '' });
    } else {
      setAddError(`Gagal menyimpan peserta. Mungkin duplikasi data atau kesalahan server.`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    if (!editingParticipant.name.trim() || !editingParticipant.origin.trim()) return;
    setEditSaving(true);
    await updateParticipant({
      ...editingParticipant,
      name: editingParticipant.name.trim(),
      origin: editingParticipant.origin.trim(),
    });
    setEditSaving(false);
    setIsEditOpen(false);
    setEditingParticipant(null);
  };

  const handleParseCSV = () => {
    setImportError('');
    setImportSuccessMsg('');
    setImportWarnMsg('');
    if (!importText.trim()) {
      setImportError('Silakan tempel data teks CSV terlebih dahulu.');
      setImportPreview([]);
      return;
    }

    const rawRows = parseCSV(importText);
    const items: ImportPreviewItem[] = [];
    let invalidLines = 0;
    let headerSkipped = false;

    rawRows.forEach((row, rowIdx) => {
      const fields = row.map(f => f.trim());
      // Baris kosong dilewati.
      if (fields.length === 1 && !fields[0]) return;
      // Deteksi baris header (mis. NAMA,UMUR,GENDER,...) — dilewati.
      if (!headerSkipped && rowIdx === 0 && isHeaderRow(fields)) { headerSkipped = true; return; }
      if (fields.length < 5 || !fields[0]) { invalidLines++; return; }
      const name = fields[0];
      const ageRaw = fields[1];
      const age = ageRaw && !isNaN(parseInt(ageRaw, 10)) ? parseInt(ageRaw, 10) : null;
      const genderRaw = fields[2].toUpperCase();
      const group = fields[3];
      const origin = fields[4];
      const gender = genderRaw === 'P' || genderRaw === 'PEREMPUAN' ? 'P' : 'L';
      if (!name || !group || !origin) { invalidLines++; return; }
      items.push({ id: '', name, age, gender, group, origin, status: 'new' });
    });

    if (items.length === 0) {
      setImportError('Tidak ada data valid ditemukan. Pastikan format: NAMA,UMUR,GENDER,KELOMPOK,KETERANGAN per baris.');
      setImportPreview([]);
      return;
    }

    // Buat ID otomatis & deteksi duplikat (di dalam file + terhadap peserta yang sudah ada).
    const year = new Date().getFullYear().toString();
    let maxNum = 0;
    participants.forEach(p => {
      const m = p.id.match(/^CAI-(\d{4})-(\d+)$/);
      if (m && m[1] === year) maxNum = Math.max(maxNum, parseInt(m[2], 10));
    });
    const existingKeys = new Set(participants.map(p => dupKey(p)));
    const seenKeys = new Set<string>();
    items.forEach((it, i) => {
      it.id = `CAI-${year}-${String(maxNum + 1 + i).padStart(3, '0')}`;
      const key = dupKey(it);
      if (existingKeys.has(key)) it.status = 'exists';
      else if (seenKeys.has(key)) it.status = 'dup-file';
      else seenKeys.add(key);
    });

    setImportPreview(items);
    if (headerSkipped) setImportSuccessMsg('Baris header terdeteksi dan dilewati.');
    if (invalidLines > 0) {
      const msg = `Ditemukan ${invalidLines} baris tidak valid (kolom kurang/kosong) yang dilewati.`;
      setImportError(prev => prev ? `${prev} ${msg}` : msg);
    }
    const dupFile = items.filter(i => i.status === 'dup-file').length;
    const exists = items.filter(i => i.status === 'exists').length;
    const total = dupFile + exists;
    if (total > 0) {
      setImportWarnMsg(
        `${exists} data sudah ada sebelumnya & ${dupFile} duplikat di dalam file → tidak akan diimpor. ` +
        `Data yang benar-benar baru: ${items.length - total}.`
      );
    }
  };

  const handleExecuteImport = async () => {
    if (importPreview.length === 0) return;
    const newItems = importPreview.filter(i => i.status === 'new');
    if (newItems.length === 0) {
      setImportWarnMsg('Semua data sudah ada sebelumnya atau duplikat di dalam file — tidak ada data baru untuk diimpor.');
      return;
    }
    setImportSaving(true);
    const dataToImport = newItems.map(({ status: _status, ...rest }) => rest);
    const importedCount = await importParticipants(dataToImport);
    setImportSaving(false);
    const skippedDup = importPreview.length - newItems.length;
    const failed = newItems.length - importedCount;
    const parts = [`Berhasil mengimpor ${importedCount} peserta baru.`];
    if (skippedDup > 0) parts.push(`${skippedDup} dilewati (sudah ada sebelumnya / duplikat).`);
    if (failed > 0) parts.push(`${failed} gagal disimpan di server.`);
    setImportSuccessMsg(parts.join(' '));
    setImportWarnMsg('');
    setImportPreview([]);
    setImportText('');
  };

  const copySampleToClipboard = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setImportSuccessMsg('Contoh teks CSV berhasil disalin ke papan klip!');
  };

  const openRecapModal = (p: Participant) => {
    setRecapParticipant(p);
    setIsRecapOpen(true);
  };

  const otsSearchResults = useMemo(() => {
    if (!otsSearchQuery.trim()) return [];
    const q = otsSearchQuery.toLowerCase();
    return participants.filter(
      (p) => {
        const name = p.name || '';
        const id = p.id || '';
        const origin = p.origin || '';
        const group = p.group || '';
        return (
          name.toLowerCase().includes(q) ||
          id.toLowerCase().includes(q) ||
          group.toLowerCase().includes(q) ||
          origin.toLowerCase().includes(q)
        );
      },
    ).slice(0, 10);
  }, [participants, otsSearchQuery]);

  const handleOtsSelectParticipant = (p: Participant) => {
    setOtsSelectedParticipant(p);
    setOtsSearchQuery('');
    setOtsMessage(null);
    setTimeout(() => otsRfidInputRef.current?.focus(), 100);
  };

  const handleOtsRfidSubmit = async (rfid: string) => {
    if (!otsSelectedParticipant || !rfid.trim()) return;
    const result = await registerRfid(otsSelectedParticipant.id, rfid.trim());
    setOtsMessage({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      setOtsSelectedParticipant(null);
      setOtsRfidValue('');
    }
    setTimeout(() => setOtsMessage(null), 4000);
  };

  const unregisteredParticipants = useMemo(
    () => participants.filter((p) => !p.rfidCardId),
    [participants],
  );

  const massPairCurrent = unregisteredParticipants[massPairIndex] || null;

  const handleMassPairNext = useCallback(async (rfid: string) => {
    if (!massPairCurrent || !rfid.trim()) return;
    const result = await registerRfid(massPairCurrent.id, rfid.trim());
    setMassPairMessage({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      if (massPairIndex + 1 >= unregisteredParticipants.length) {
        setMassPairDone(true);
      } else {
        setMassPairIndex((prev) => prev + 1);
      }
    }
    setTimeout(() => {
      setMassPairMessage(null);
      if (massPairInputRef.current) massPairInputRef.current.value = '';
      massPairInputRef.current?.focus();
    }, 1500);
  }, [massPairCurrent, massPairIndex, unregisteredParticipants.length]);

  const handleMassPairSkip = () => {
    if (massPairIndex + 1 >= unregisteredParticipants.length) {
      setMassPairDone(true);
    } else {
      setMassPairIndex((prev) => prev + 1);
      setMassPairMessage(null);
      if (massPairInputRef.current) massPairInputRef.current.value = '';
      massPairInputRef.current?.focus();
    }
  };

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch { /* ignore */ }
  };

  const recapStats = useMemo(() => {
    if (!recapParticipant) return { attended: 0, late: 0, total: 0 };
    let attended = 0;
    let late = 0;
    sortedSessions.forEach((s) => {
      const st = getSessionStatus(recapParticipant.id, s.id);
      if (st.status === 'Hadir' || st.status === 'Terlambat') attended++;
      if (st.status === 'Terlambat') late++;
    });
    return { attended, late, total: sortedSessions.length };
  }, [recapParticipant, sortedSessions, checkInLogs]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Manajemen Data Peserta CAI
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data peserta, lihat rekap kehadiran per sesi, atau import data massal via CSV.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setIsMassPairOpen(true);
              setMassPairIndex(0);
              setMassPairDone(false);
              setMassPairMessage(null);
            }}
            disabled={unregisteredParticipants.length === 0}
            className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-700/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4" />
            Daftar RFID Massal
          </button>
          <button
            onClick={() => {
              setIsOtsRfidOpen(true);
              setOtsSelectedParticipant(null);
              setOtsSearchQuery('');
              setOtsMessage(null);
              setOtsRfidValue('');
            }}
            className="px-4 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-violet-700/10 cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Daftar RFID On-The-Spot
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            Import CSV
          </button>          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-700/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Tambah Peserta
          </button>
          <button
            onClick={() => {
              setIsResetOpen(true);
              setResetConfirmValue('');
              setResetStatus('idle');
            }}
            className="px-4 py-2.5 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset Data
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => {
                setIsBatchDeleteOpen(true);
                setBatchDeleteStatus('idle');
              }}
              className="px-4 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-rose-700/10 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus {selectedIds.size} Terpilih
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards: Peserta vs Panitia ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Peserta</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{pesertaCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Panitia</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{panitiaCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Terdaftar</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{pesertaCount + panitiaCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 mb-6">
        {/* Row 0: Kategori filter (Peserta / Panitia) */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori:</span>
          <div className="flex gap-1.5">
            {(['all', 'peserta', 'panitia'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? cat === 'peserta'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : cat === 'panitia'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'Semua' : cat === 'peserta' ? 'Peserta' : 'Panitia'}
              </button>
            ))}
          </div>
          {categoryFilter !== 'all' && (
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {categoryFilter === 'peserta' ? pesertaCount : panitiaCount} orang
            </span>
          )}
        </div>

        {/* Row 1: Search + Kelompok + Status filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan ID, nama, desa, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Semua Kelompok</option>
              {groupsList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Session Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Calendar className="h-4 w-4 text-blue-500" />
            Filter Status per Sesi:
          </div>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="flex-1 w-full sm:w-auto px-3 py-2.5 border border-blue-200 bg-blue-50/30 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Pilih Sesi Aktif --</option>
            {sortedSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.dayName} &middot; {s.name} (Sesi {s.sessionNumber}) &middot; {s.startTime}
              </option>
            ))}
          </select>
          {selectedSession && (
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 whitespace-nowrap">
              {selectedSession.dayName} &middot; {selectedSession.startTime}
            </span>
          )}
        </div>
      </div>

      {/* ── Loader ── */}
      {isDataLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-16 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">Memuat data peserta...</p>
        </div>
      ) : (
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200/80">
            <thead className="bg-slate-50/75">
              <tr>
                <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12">No</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[22%] cursor-pointer select-none hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('name')}>
                  Nama Peserta {sortField === 'name' && <SortIcon dir={sortDirection} />}
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[13%]">ID Card</th>
                <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[6%]">Umur</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[11%] cursor-pointer select-none hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('gender')}>
                  Gender {sortField === 'gender' && <SortIcon dir={sortDirection} />}
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[14%] cursor-pointer select-none hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('group')}>
                  Kelompok / Desa {sortField === 'group' && <SortIcon dir={sortDirection} />}
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[13%]">Status Absensi</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[11%] cursor-pointer select-none hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('origin')}>
                  Keterangan {sortField === 'origin' && <SortIcon dir={sortDirection} />}
                </th>
                <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[15%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {paginatedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Tidak ada data peserta ditemukan yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map((p, idx) => {
                  const sessionStatus = selectedSessionId
                    ? getSessionStatus(p.id, selectedSessionId)
                    : null;
                  return (
                    <tr key={p.id} className={`transition-colors ${
                      getParticipantCategory(p.origin) === 'PANITIA'
                        ? 'bg-amber-50/40 hover:bg-amber-100/50'
                        : 'hover:bg-slate-50/40'
                    }`}>
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      {/* No */}
                      <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Nama */}
                      <td className="px-4 py-3.5 truncate max-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900 text-sm truncate">{p.name}</span>
                          <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold leading-none border ${
                            getParticipantCategory(p.origin) === 'PANITIA'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {CATEGORY_LABEL[getParticipantCategory(p.origin)]}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{p.id}</div>
                      </td>

                      {/* ID CARD (RFID UID) */}
                      <td className="px-4 py-3.5 truncate text-xs">
                        {p.rfidCardId ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50/60 text-blue-700 border border-blue-100/60 px-2.5 py-1 rounded-lg font-mono font-bold">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600" />
                            </span>
                            {p.rfidCardId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum Didaftarkan</span>
                        )}
                      </td>

                      {/* Umur */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-bold text-slate-600">
                        {p.age ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">{p.age}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold leading-none ${
                            p.gender === 'L'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-pink-50 text-pink-700 border border-pink-100'
                          }`}
                        >
                          {p.gender === 'L' ? 'LAKI-LAKI (L)' : 'PEREMPUAN (P)'}
                        </span>
                      </td>

                      {/* Kelompok / Desa */}
                      <td className="px-4 py-3.5 truncate text-xs font-bold text-slate-600">
                        <span className="truncate block">{p.group}</span>
                      </td>

                      {/* Status Absensi (session-aware) */}
                      <td className="px-4 py-3.5 truncate">
                        {sessionStatus ? (
                          sessionStatus.status === 'Hadir' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              HADIR
                            </span>
                          ) : sessionStatus.status === 'Terlambat' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              TERLAMBAT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle className="h-3 w-3 text-slate-400" />
                              TIDAK HADIR
                            </span>
                          )
                        ) : p.isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                            HADIR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="h-3 w-3 text-slate-400" />
                            BELUM HADIR
                          </span>
                        )}
                      </td>

                      {/* Keterangan */}
                      <td className="px-4 py-3.5 truncate text-xs font-semibold">
                        {sessionStatus ? (
                          sessionStatus.status === 'Hadir' ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              Tepat Waktu
                            </span>
                          ) : sessionStatus.status === 'Terlambat' ? (
                            <span className="text-amber-700 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {sessionStatus.detail}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )
                        ) : (
                          <span className="text-slate-700">{p.origin || '-'}</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-center text-xs font-medium">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openRecapModal(p)}
                            className="p-1.5 bg-violet-50 border border-violet-200 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer"
                            title="Lihat Rekap"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                          </button>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Tampilkan</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {[10, 20, 50, 75, 100].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="font-medium">
              dari {sortedParticipants.length} data
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page = startPage + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[32px] px-2 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: ADD PARTICIPANT
         ═══════════════════════════════════════════════════════════════ */}
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
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                {addError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">{addError}</div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ID Registrasi (Auto-generated)</label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700 select-all">
                    {autoId}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Rafli"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Umur</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Contoh: 25"
                    value={newParticipant.age}
                    onChange={(e) => setNewParticipant((prev) => ({ ...prev, age: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewParticipant((prev) => ({ ...prev, gender: 'L' }))}
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
                      onClick={() => setNewParticipant((prev) => ({ ...prev, gender: 'P' }))}
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kelompok / Desa</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Desa Karangrejo"
                    value={newParticipant.group}
                    onChange={(e) => setNewParticipant((prev) => ({ ...prev, group: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KI Desa, MT Desa"
                    value={newParticipant.origin}
                    onChange={(e) => setNewParticipant((prev) => ({ ...prev, origin: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                    <span>Serial Kartu RFID (Opsional)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const hex = Math.floor(Math.random() * 0xffffffff)
                          .toString(16)
                          .toUpperCase()
                          .padStart(8, '0');
                        setNewParticipant((prev) => ({ ...prev, rfidCardId: hex }));
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
                    onChange={(e) => setNewParticipant((prev) => ({ ...prev, rfidCardId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 uppercase font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button type="button" disabled={addSaving} onClick={() => setIsAddOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer bg-white disabled:opacity-40">
                    Batal
                  </button>
                  <button type="submit" disabled={addSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-all">
                    {addSaving ? (
                      <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> Menyimpan...</>
                    ) : 'Simpan Peserta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: EDIT PARTICIPANT
         ═══════════════════════════════════════════════════════════════ */}
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
                    onChange={(e) => setEditingParticipant((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Umur</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Contoh: 25"
                    value={editingParticipant.age ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      setEditingParticipant((prev) => (prev ? { ...prev, age: isNaN(val as number) ? null : val } : null));
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingParticipant((prev) => (prev ? { ...prev, gender: 'L' } : null))}
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
                      onClick={() => setEditingParticipant((prev) => (prev ? { ...prev, gender: 'P' } : null))}
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kelompok / Desa</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Desa Karangrejo"
                    value={editingParticipant.group}
                    onChange={(e) => setEditingParticipant((prev) => (prev ? { ...prev, group: e.target.value } : null))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KI Desa, MT Desa"
                    value={editingParticipant.origin}
                    onChange={(e) => setEditingParticipant((prev) => (prev ? { ...prev, origin: e.target.value } : null))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                    <span>Serial Kartu RFID (Opsional)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const hex = Math.floor(Math.random() * 0xffffffff)
                          .toString(16)
                          .toUpperCase()
                          .padStart(8, '0');
                        setEditingParticipant((prev) => (prev ? { ...prev, rfidCardId: hex } : null));
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
                    onChange={(e) => setEditingParticipant((prev) => (prev ? { ...prev, rfidCardId: e.target.value } : null))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 uppercase font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditingParticipant(null);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer bg-white disabled:opacity-40"
                  >
                    Batal
                  </button>
                  <button type="submit" disabled={editSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-all">
                    {editSaving ? (
                      <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> Menyimpan...</>
                    ) : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: IMPORT CSV
         ═══════════════════════════════════════════════════════════════ */}
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
                    setImportWarnMsg('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900">
                  <p className="font-bold flex items-center gap-1.5 mb-1.5 text-slate-900">
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    Panduan Format Impor Teks Comma-Separated (CSV)
                  </p>
                  <p className="leading-relaxed mb-3 text-slate-600 font-medium">
                    Tempel data baris baru dengan struktur kolom dipisahkan koma berikut (ID dihasilkan otomatis oleh sistem):
                    <br />
                    <code className="font-bold font-mono bg-blue-100/75 px-1 py-0.5 rounded text-blue-950">
                      NAMA_LENGKAP,UMUR,GENDER(L/P),KELOMPOK_DESA,KETERANGAN
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
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">{importError}</div>
                )}
                {importSuccessMsg && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    {importSuccessMsg}
                  </div>
                )}
                {importWarnMsg && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-start gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    {importWarnMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tempel Data CSV</label>
                  <textarea
                    rows={5}
                    placeholder="Contoh: CAI-2026-101,Rizky Pratama,25,L,Kelompok Semeru,Surabaya,58C3FA2C"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 text-slate-900"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button type="button" onClick={handleParseCSV} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer">
                    Proses CSV & Tampilkan Preview
                  </button>
                  {importPreview.length > 0 && (
                    <button
                      type="button"
                      disabled={importSaving}
                      onClick={handleExecuteImport}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
                    >
                      {importSaving ? (
                        <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> Mengimpor...</>
                      ) : (
                        <><Check className="h-3.5 w-3.5" /> Impor {importPreview.filter(i => i.status === 'new').length} Peserta Baru</>
                      )}
                    </button>
                  )}
                </div>

                {importPreview.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-[10px] text-slate-500 uppercase">
                      Pratinjau Data ({importPreview.length} baris — {importPreview.filter(i => i.status === 'new').length} baru, {importPreview.filter(i => i.status === 'exists').length} sudah ada, {importPreview.filter(i => i.status === 'dup-file').length} duplikat)
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left text-slate-600">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="p-2">#</th>
                                <th className="p-2">Nama</th>
                                <th className="p-2">Umur</th>
                                <th className="p-2">Gender</th>
                                <th className="p-2">Kelompok</th>
                                <th className="p-2">Keterangan</th>
                                <th className="p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {importPreview.map((item, index) => (
                                <tr key={index} className={`hover:bg-slate-50 ${item.status === 'exists' ? 'bg-amber-50/50' : item.status === 'dup-file' ? 'bg-rose-50/50' : ''}`}>
                                  <td className="p-2 font-mono font-bold text-slate-400">{index + 1}</td>
                                  <td className="p-2 font-bold text-slate-900">{item.name}</td>
                                  <td className="p-2 font-mono">{item.age ?? '-'}</td>
                                  <td className="p-2">{item.gender}</td>
                                  <td className="p-2">{item.group}</td>
                                  <td className="p-2">{item.origin}</td>
                                  <td className="p-2 whitespace-nowrap">
                                    {item.status === 'new' ? (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">BARU</span>
                                    ) : item.status === 'exists' ? (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">SUDAH ADA</span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">DUPLIKAT</span>
                                    )}
                                  </td>
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
                    setImportWarnMsg('');
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

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: DAFTAR RFID ON-THE-SPOT (Alur A)
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isOtsRfidOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-violet-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="h-4.5 w-4.5 text-violet-600" />
                  Daftar RFID On-The-Spot
                </h3>
                <button
                  onClick={() => {
                    setIsOtsRfidOpen(false);
                    setOtsSelectedParticipant(null);
                    setOtsSearchQuery('');
                    setOtsMessage(null);
                    setOtsRfidValue('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {!otsSelectedParticipant ? (
                  <>
                    <p className="text-xs text-slate-500 font-medium">
                      Cari peserta berdasarkan nama, ID, atau keterangan, lalu tap kartu RFID.
                    </p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ketik nama / ID peserta..."
                        value={otsSearchQuery}
                        onChange={(e) => {
                          setOtsSearchQuery(e.target.value);
                          setOtsMessage(null);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    {otsSearchResults.length > 0 && (
                      <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {otsSearchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleOtsSelectParticipant(p)}
                            className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors flex items-center gap-3 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-900 truncate">{p.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{p.id} &middot; {p.group}</div>
                            </div>
                            {p.rfidCardId && (
                              <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shrink-0">
                                {p.rfidCardId}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center font-bold text-sm shrink-0">
                        {otsSelectedParticipant.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-900">{otsSelectedParticipant.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{otsSelectedParticipant.id}</div>
                      </div>
                      <button
                        onClick={() => {
                          setOtsSelectedParticipant(null);
                          setOtsRfidValue('');
                          setOtsMessage(null);
                        }}
                        className="text-[10px] font-bold text-violet-600 hover:underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tap / Ketik Kartu RFID
                      </label>
                      <input
                        ref={otsRfidInputRef}
                        type="text"
                        placeholder="Tunggu input dari reader RFID..."
                        value={otsRfidValue}
                        onChange={(e) => setOtsRfidValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && otsRfidValue.trim()) {
                            handleOtsRfidSubmit(otsRfidValue);
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-violet-300 rounded-xl text-center text-lg font-mono font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 tracking-widest bg-violet-50/50"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (otsRfidValue.trim()) handleOtsRfidSubmit(otsRfidValue);
                      }}
                      disabled={!otsRfidValue.trim()}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      Simpan RFID
                    </button>
                  </>
                )}

                {otsMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold ${
                      otsMessage.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {otsMessage.text}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtsRfidOpen(false);
                    setOtsSelectedParticipant(null);
                    setOtsSearchQuery('');
                    setOtsMessage(null);
                    setOtsRfidValue('');
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

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 5: DAFTAR RFID MASSAL (Alur B)
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMassPairOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="h-4.5 w-4.5 text-emerald-600" />
                  Daftar RFID Massal
                </h3>
                <button
                  onClick={() => setIsMassPairOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {unregisteredParticipants.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">Semua peserta sudah terdaftar RFID!</p>
                    <p className="text-xs text-slate-400 mt-1">Tidak ada peserta yang perlu dipasangkan kartu.</p>
                  </div>
                ) : massPairDone ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">Selesai!</p>
                    <p className="text-xs text-slate-400 mt-1">Semua peserta yang tersedia sudah dipasangkan RFID.</p>
                    <button
                      onClick={() => setIsMassPairOpen(false)}
                      className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      Tutup
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-500">Progress</span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        {massPairIndex + 1} / {unregisteredParticipants.length}
                      </span>
                    </div>

                    {massPairCurrent && (
                      <>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                            {massPairCurrent.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-slate-900">{massPairCurrent.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {massPairCurrent.id} &middot; {massPairCurrent.group} &middot; {massPairCurrent.origin}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Tap / Ketik Kartu RFID
                          </label>
                          <input
                            ref={massPairInputRef}
                            type="text"
                            autoFocus
                            placeholder="Tunggu input dari reader RFID..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  playBeep();
                                  handleMassPairNext(val);
                                }
                              }
                            }}
                            className="w-full px-4 py-3 border-2 border-emerald-300 rounded-xl text-center text-lg font-mono font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest bg-emerald-50/50"
                          />
                        </div>

                        <div className="flex gap-2.5">
                          <button
                            onClick={handleMassPairSkip}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <SkipForward className="h-3.5 w-3.5" />
                            Lewati
                          </button>
                        </div>
                      </>
                    )}

                    {massPairMessage && (
                      <div
                        className={`p-3 rounded-xl text-xs font-semibold ${
                          massPairMessage.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border border-rose-200 text-rose-800'
                        }`}
                      >
                        {massPairMessage.text}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsMassPairOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer bg-white"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 6: REKAP INDIVIDUAL
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isRecapOpen && recapParticipant && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ClipboardList className="h-4.5 w-4.5 text-violet-600" />
                  Rekap Kehadiran Individu
                </h3>
                <button
                  onClick={() => {
                    setIsRecapOpen(false);
                    setRecapParticipant(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Participant Info Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center border border-violet-200 shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm">{recapParticipant.name}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{recapParticipant.id}</span>
                      <span className="mx-1.5">&middot;</span>
                      {recapParticipant.group}
                      <span className="mx-1.5">&middot;</span>
                      {recapParticipant.origin}
                    </div>
                  </div>
                  {recapParticipant.rfidCardId && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px]">
                      <CreditCard className="h-3 w-3" />
                      {recapParticipant.rfidCardId}
                    </span>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-lg font-extrabold text-slate-900">{recapStats.total}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Sesi</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <div className="text-lg font-extrabold text-emerald-700">{recapStats.attended}</div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">Hadir</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <div className="text-lg font-extrabold text-amber-700">{recapStats.late}</div>
                    <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Terlambat</div>
                  </div>
                </div>

                {/* Attendance Table per Session */}
                {sortedSessions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">Belum ada sesi yang terdaftar di sistem.</div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hari</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sesi</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Mulai</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedSessions.map((s) => {
                          const st = getSessionStatus(recapParticipant.id, s.id);
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">{s.dayName}</td>
                              <td className="px-3 py-3 font-semibold text-slate-600 whitespace-nowrap">
                                Sesi {s.sessionNumber} &middot; {s.name}
                              </td>
                              <td className="px-3 py-3 font-mono text-slate-500 whitespace-nowrap">{s.startTime}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {st.status === 'Hadir' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                                    HADIR
                                  </span>
                                ) : st.status === 'Terlambat' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                                    TERLAMBAT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    <XCircle className="h-3 w-3 text-slate-400" />
                                    TIDAK HADIR
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap font-semibold">
                                {st.status === 'Hadir' ? (
                                  <span className="text-emerald-700 flex items-center gap-1">
                                    <BadgeCheck className="h-3 w-3" />
                                    Tepat Waktu
                                  </span>
                                ) : st.status === 'Terlambat' ? (
                                  <span className="text-amber-700 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {st.detail}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecapOpen(false);
                    setRecapParticipant(null);
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

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 7: BATCH DELETE PARTICIPANTS
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isBatchDeleteOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Trash2 className="h-4.5 w-4.5 text-rose-600" />
                  Hapus {selectedIds.size} Peserta
                </h3>
                <button
                  onClick={() => { setIsBatchDeleteOpen(false); setBatchDeleteStatus('idle'); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {batchDeleteStatus === 'done' ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-800">Berhasil dihapus!</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedIds.size} peserta telah dihapus dari sistem.</p>
                    <button
                      onClick={() => { setIsBatchDeleteOpen(false); setBatchDeleteStatus('idle'); setSelectedIds(new Set()); }}
                      className="mt-5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      Tutup
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Peringatan!
                      </p>
                      <p className="leading-relaxed text-rose-800">
                        Anda akan menghapus <strong>{selectedIds.size} peserta</strong> berikut secara permanen:
                      </p>
                      <ul className="max-h-32 overflow-y-auto space-y-1">
                        {filteredParticipants
                          .filter(p => selectedIds.has(p.id))
                          .map(p => (
                            <li key={p.id} className="flex items-center gap-2 text-rose-800">
                              <XCircle className="h-3 w-3 shrink-0 text-rose-400" />
                              <span className="font-semibold">{p.name}</span>
                              <span className="font-mono text-rose-500">({p.id})</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={() => { setIsBatchDeleteOpen(false); setBatchDeleteStatus('idle'); }}
                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
                      >
                        Batal
                      </button>
                      <button
                        disabled={batchDeleteStatus === 'loading'}
                        onClick={async () => {
                          setBatchDeleteStatus('loading');
                          try {
                            const ids = Array.from(selectedIds);
                            await Promise.all(ids.map(id => deleteParticipant(id)));
                            setBatchDeleteStatus('done');
                          } catch {
                            setBatchDeleteStatus('idle');
                          }
                        }}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-300 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {batchDeleteStatus === 'loading' ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Menghapus...
                          </>
                        ) : 'Hapus Peserta'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 8: RESET ALL DATA (safe confirmation)
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isResetOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                  Reset Semua Data
                </h3>
                <button
                  onClick={() => { setIsResetOpen(false); setResetStatus('idle'); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {resetStatus === 'done' ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-800">Data berhasil di-reset!</p>
                    <p className="text-xs text-slate-500 mt-1">Semua data absensi dan log telah dikosongkan.</p>
                    <button
                      onClick={() => { setIsResetOpen(false); setResetStatus('idle'); }}
                      className="mt-5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      Tutup
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Peringatan!
                      </p>
                      <p className="leading-relaxed text-rose-800">
                        Tindakan ini akan <strong>menghapus seluruh data absensi</strong> (status kehadiran, log check-in) 
                        untuk semua peserta. Data peserta itu sendiri tidak akan dihapus.
                      </p>
                      <p className="font-semibold text-rose-800">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Ketik <span className="text-rose-600 underline underline-offset-2">RESET</span> untuk konfirmasi
                      </label>
                      <input
                        type="text"
                        autoFocus
                        placeholder='Ketik "RESET" di sini...'
                        value={resetConfirmValue}
                        onChange={(e) => setResetConfirmValue(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-rose-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-slate-900 text-center font-bold tracking-widest uppercase"
                      />
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={() => { setIsResetOpen(false); setResetStatus('idle'); }}
                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
                      >
                        Batal
                      </button>
                      <button
                        disabled={resetConfirmValue !== 'RESET' || resetStatus === 'loading'}
                        onClick={async () => {
                          if (resetConfirmValue !== 'RESET') return;
                          setResetStatus('loading');
                          try {
                            await resetAllAttendance();
                            setResetStatus('done');
                          } catch {
                            setResetStatus('idle');
                          }
                        }}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-300 text-white text-xs font-bold rounded-xl cursor-pointer disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {resetStatus === 'loading' ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Memproses...
                          </>
                        ) : 'Reset Data'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
