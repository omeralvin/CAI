export type Role = 'admin' | 'operator';

export interface User {
  username: string;
  name: string;
  role: Role;
  avatarUrl?: string;
}

export interface Participant {
  id: string;
  name: string;
  age?: number | null;
  gender: 'L' | 'P';
  group: string; // e.g. "Kelompok 1", "Panitia", "Tamu"
  origin: string; // e.g. "Kota Kediri", "Surabaya", "Malang"
  isCheckedIn: boolean;
  checkInTime?: string | null;
  scannedBy?: string | null;
  rfidCardId?: string | null;
}

export interface CheckInLog {
  id: string;
  participantId: string;
  participantName: string;
  group: string;
  timestamp: string;
  operatorName: string;
  status: 'PRESENT' | 'LATE' | 'already_checked_in' | 'error';
  sessionId?: string | null;
  isLate?: boolean;
  lateDuration?: number | null;
}

export interface AttendanceSession {
  id: string;
  dayName: string;
  date: string;
  sessionNumber: number;
  startTime: string;
  endTime: string;
  name: string;
}

export interface DashboardData {
  session: AttendanceSession;
  summary: { total: number; present: number; absent: number; lateCount: number };
  lateList: { participantName: string; participantId: string; group: string; lateDuration: number | null; timestamp: string }[];
  groupStats: { group: string; total: number; present: number; absent: number; late: number; percent: number }[];
}

export interface FgdMinute {
  id: string;
  groupNumber: number;
  sessionName: string;
  authorName?: string | null;
  usulanPermasalahan: string;
  problem: string;
  penyebab: string;
  solusi: string;
  actionPlanBidangPpg: string;
  actionPlanDeskripsi: string;
  actionPlanNamaKegiatan: string;
  actionPlanPeserta: string;
  actionPlanWaktu: string;
  actionPlanDana: string;
  peranKeimaman: string;
  peranPengurus: string;
  peranOrangTua: string;
  peranMubaligh: string;
  peranAhliPendidik: string;
  createdAt: string;
  updatedAt: string;
}

export type PageId = 'public-landing' | 'login' | 'operator-checkin' | 'admin-dashboard' | 'admin-participants' | 'admin-idcard' | 'admin-fgd' | 'admin-fgd-present';
