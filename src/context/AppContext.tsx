import React, { createContext, useContext, useState, useEffect } from 'react';
import { Participant, CheckInLog, User, PageId } from '../types';

interface AppContextType {
  currentUser: User | null;
  login: (username: string, role: 'admin' | 'operator') => boolean;
  logout: () => void;
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  checkInLogs: CheckInLog[];
  checkInParticipant: (id: string, operatorName: string) => { success: boolean; message: string; participant?: Participant };
  addParticipant: (participant: Omit<Participant, 'isCheckedIn'>) => boolean;
  deleteParticipant: (id: string) => void;
  updateParticipant: (participant: Participant) => void;
  importParticipants: (newParticipants: Omit<Participant, 'isCheckedIn'>[]) => number;
  resetAllAttendance: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// High-fidelity initial mock data
const INITIAL_PARTICIPANTS: Participant[] = [
  { id: "CAI-2026-001", name: "Achmad Fauzi", gender: "L", group: "Kelompok Semeru", origin: "Surabaya", isCheckedIn: true, checkInTime: "2026-07-15T08:15:30Z", scannedBy: "Budi (Operator)" },
  { id: "CAI-2026-002", name: "Anisa Rahmawati", gender: "P", group: "Kelompok Semeru", origin: "Sidoarjo", isCheckedIn: true, checkInTime: "2026-07-15T08:17:45Z", scannedBy: "Budi (Operator)" },
  { id: "CAI-2026-003", name: "Bagus Setiawan", gender: "L", group: "Kelompok Rinjani", origin: "Malang", isCheckedIn: false },
  { id: "CAI-2026-004", name: "Citra Lestari", gender: "P", group: "Kelompok Rinjani", origin: "Kediri", isCheckedIn: true, checkInTime: "2026-07-15T08:32:10Z", scannedBy: "Budi (Operator)" },
  { id: "CAI-2026-005", name: "Dedi Prasetyo", gender: "L", group: "Kelompok Merbabu", origin: "Gresik", isCheckedIn: false },
  { id: "CAI-2026-006", name: "Eka Wahyuni", gender: "P", group: "Kelompok Merbabu", origin: "Banyuwangi", isCheckedIn: false },
  { id: "CAI-2026-007", name: "Fajar Nugraha", gender: "L", group: "Kelompok Bromo", origin: "Jember", isCheckedIn: true, checkInTime: "2026-07-15T08:45:00Z", scannedBy: "Budi (Operator)" },
  { id: "CAI-2026-008", name: "Gita Safitri", gender: "P", group: "Kelompok Bromo", origin: "Mojokerto", isCheckedIn: false },
  { id: "CAI-2026-009", name: "Hendra Wijaya", gender: "L", group: "Panitia", origin: "Surabaya", isCheckedIn: true, checkInTime: "2026-07-15T07:30:15Z", scannedBy: "System" },
  { id: "CAI-2026-010", name: "Indah Permatasari", gender: "P", group: "Panitia", origin: "Malang", isCheckedIn: true, checkInTime: "2026-07-15T07:35:00Z", scannedBy: "System" },
  { id: "CAI-2026-011", name: "Joko Susilo", gender: "L", group: "Tamu Undangan", origin: "Madiun", isCheckedIn: false },
  { id: "CAI-2026-012", name: "Kartika Sari", gender: "P", group: "Tamu Undangan", origin: "Pasuruan", isCheckedIn: false },
  { id: "CAI-2026-013", name: "Lukman Hakim", gender: "L", group: "Kelompok Semeru", origin: "Lamongan", isCheckedIn: false },
  { id: "CAI-2026-014", name: "Megawati Putri", gender: "P", group: "Kelompok Rinjani", origin: "Tuban", isCheckedIn: false },
  { id: "CAI-2026-015", name: "Noval Ardiansyah", gender: "L", group: "Kelompok Merbabu", origin: "Bojonegoro", isCheckedIn: false },
];

const INITIAL_LOGS: CheckInLog[] = [
  { id: "LOG-1", participantId: "CAI-2026-009", participantName: "Hendra Wijaya", group: "Panitia", timestamp: "2026-07-15T07:30:15Z", operatorName: "System", status: "success" },
  { id: "LOG-2", participantId: "CAI-2026-010", participantName: "Indah Permatasari", group: "Panitia", timestamp: "2026-07-15T07:35:00Z", operatorName: "System", status: "success" },
  { id: "LOG-3", participantId: "CAI-2026-001", participantName: "Achmad Fauzi", group: "Kelompok Semeru", timestamp: "2026-07-15T08:15:30Z", operatorName: "Budi (Operator)", status: "success" },
  { id: "LOG-4", participantId: "CAI-2026-002", participantName: "Anisa Rahmawati", group: "Kelompok Semeru", timestamp: "2026-07-15T08:17:45Z", operatorName: "Budi (Operator)", status: "success" },
  { id: "LOG-5", participantId: "CAI-2026-004", participantName: "Citra Lestari", group: "Kelompok Rinjani", timestamp: "2026-07-15T08:32:10Z", operatorName: "Budi (Operator)", status: "success" },
  { id: "LOG-6", participantId: "CAI-2026-007", participantName: "Fajar Nugraha", group: "Kelompok Bromo", timestamp: "2026-07-15T08:45:00Z", operatorName: "Budi (Operator)", status: "success" },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cai_user');
    return saved ? JSON.parse(saved) : { username: "admin", name: "Administrator CAI", role: "admin" }; // Default for easy preview, but users can change or logout
  });

  const [currentPage, setCurrentPage] = useState<PageId>(() => {
    const saved = localStorage.getItem('cai_page');
    // Set default based on current user role
    if (saved) return saved as PageId;
    return 'admin-dashboard';
  });

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('cai_participants');
    return saved ? JSON.parse(saved) : INITIAL_PARTICIPANTS;
  });

  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>(() => {
    const saved = localStorage.getItem('cai_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Keep localStorage in sync
  useEffect(() => {
    localStorage.setItem('cai_user', currentUser ? JSON.stringify(currentUser) : '');
    localStorage.setItem('cai_page', currentPage);
  }, [currentUser, currentPage]);

  useEffect(() => {
    localStorage.setItem('cai_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('cai_logs', JSON.stringify(checkInLogs));
  }, [checkInLogs]);

  const login = (username: string, role: 'admin' | 'operator'): boolean => {
    if (!username.trim()) return false;
    
    const name = role === 'admin' ? "Administrator CAI" : `${username} (Operator)`;
    const user: User = { username, name, role };
    setCurrentUser(user);
    
    if (role === 'admin') {
      setCurrentPage('admin-dashboard');
    } else {
      setCurrentPage('operator-checkin');
    }
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const checkInParticipant = (id: string, operatorName: string) => {
    const trimmedId = id.trim().toUpperCase();
    const index = participants.findIndex(p => p.id.toUpperCase() === trimmedId);

    if (index === -1) {
      return { success: false, message: `ID Peserta "${trimmedId}" tidak ditemukan!` };
    }

    const participant = participants[index];

    if (participant.isCheckedIn) {
      // Log double check-in attempt
      const newLog: CheckInLog = {
        id: `LOG-${Date.now()}`,
        participantId: participant.id,
        participantName: participant.name,
        group: participant.group,
        timestamp: new Date().toISOString(),
        operatorName,
        status: 'already_checked_in'
      };
      setCheckInLogs(prev => [newLog, ...prev]);

      return { 
        success: false, 
        message: `${participant.name} sudah melakukan absensi sebelumnya!`,
        participant 
      };
    }

    // Perform check-in
    const timestamp = new Date().toISOString();
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...participant,
      isCheckedIn: true,
      checkInTime: timestamp,
      scannedBy: operatorName
    };

    setParticipants(updatedParticipants);

    const newLog: CheckInLog = {
      id: `LOG-${Date.now()}`,
      participantId: participant.id,
      participantName: participant.name,
      group: participant.group,
      timestamp,
      operatorName,
      status: 'success'
    };

    setCheckInLogs(prev => [newLog, ...prev]);

    return { 
      success: true, 
      message: `Absensi Berhasil! Selamat datang ${participant.name}.`,
      participant: updatedParticipants[index]
    };
  };

  const addParticipant = (newP: Omit<Participant, 'isCheckedIn'>): boolean => {
    if (participants.some(p => p.id.toUpperCase() === newP.id.toUpperCase())) {
      return false; // ID already exists
    }

    const participant: Participant = {
      ...newP,
      isCheckedIn: false,
      checkInTime: null,
      scannedBy: null
    };

    setParticipants(prev => [...prev, participant]);
    return true;
  };

  const deleteParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    // Keep logs but they won't link to existing participant, which is fine
  };

  const updateParticipant = (updated: Participant) => {
    setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const importParticipants = (newParticipants: Omit<Participant, 'isCheckedIn'>[]): number => {
    let count = 0;
    setParticipants(prev => {
      const updated = [...prev];
      newParticipants.forEach(item => {
        // Only insert if ID doesn't already exist
        if (!updated.some(p => p.id.toUpperCase() === item.id.toUpperCase())) {
          updated.push({
            ...item,
            isCheckedIn: false,
            checkInTime: null,
            scannedBy: null
          });
          count++;
        }
      });
      return updated;
    });
    return count;
  };

  const resetAllAttendance = () => {
    setParticipants(prev => prev.map(p => ({
      ...p,
      isCheckedIn: false,
      checkInTime: null,
      scannedBy: null
    })));
    setCheckInLogs([]);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      logout,
      currentPage,
      setCurrentPage,
      participants,
      setParticipants,
      checkInLogs,
      checkInParticipant,
      addParticipant,
      deleteParticipant,
      updateParticipant,
      importParticipants,
      resetAllAttendance
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
