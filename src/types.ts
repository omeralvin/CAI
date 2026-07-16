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
  status: 'success' | 'already_checked_in' | 'error';
}

export type PageId = 'login' | 'operator-checkin' | 'admin-dashboard' | 'admin-participants';
