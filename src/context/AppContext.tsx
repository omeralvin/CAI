import { API_BASE_URL } from '../api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Participant, CheckInLog, User, PageId, AttendanceSession, DashboardData } from '../types';

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  checkInLogs: CheckInLog[];
  sessions: AttendanceSession[];
  fetchSessions: () => Promise<void>;
  upsertSession: (session: Omit<AttendanceSession, 'id'> & { id?: string }) => Promise<boolean>;
  updateSession: (id: string, data: Partial<Omit<AttendanceSession, 'id'>>) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;
  fetchDashboard: (sessionId?: string) => Promise<DashboardData | null>;
  exportPdfUrl: (sessionId?: string) => string;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  checkInParticipant: (id: string, operatorName: string) => Promise<{ success: boolean; message: string; participant?: Participant }>;
  checkInByRfid: (rfidCardId: string, operatorName: string) => Promise<{ success: boolean; message: string; participant?: Participant }>;
  addParticipant: (participant: Omit<Participant, 'isCheckedIn'>) => Promise<boolean>;
  deleteParticipant: (id: string) => Promise<void>;
  updateParticipant: (participant: Participant) => Promise<void>;
  importParticipants: (newParticipants: Omit<Participant, 'isCheckedIn'>[]) => Promise<number>;
  registerRfid: (participantId: string, rfidCardId: string) => Promise<{ success: boolean; message: string }>;
  resetAllAttendance: () => Promise<void>;
  refreshBackendData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);



export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>('login');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Helper to fetch authorization headers
  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('cai_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, []);

  // Fetch participants, logs, and sessions from server
  const refreshData = useCallback(async () => {
    const token = localStorage.getItem('cai_token');
    if (!token) return;

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [partsRes, logsRes, sessRes] = await Promise.all([
        fetch(`${API_BASE_URL}/participants`, { headers }),
        fetch(`${API_BASE_URL}/checkin/logs`, { headers }),
        fetch(`${API_BASE_URL}/sessions`, { headers })
      ]);

      if (partsRes.ok) {
        const partsData = await partsRes.json();
        setParticipants(partsData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setCheckInLogs(logsData);
      }
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData);
      }
    } catch (error) {
      console.error('Error refreshing backend data:', error);
    }
  }, []);

  // Check login session on mount
  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('cai_token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const user = await response.json();
            setCurrentUser(user);
            setCurrentPage(user.role === 'admin' ? 'admin-dashboard' : 'operator-checkin');
          } else {
            localStorage.removeItem('cai_token');
            setCurrentUser(null);
            setCurrentPage('login');
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          setCurrentPage('login');
        }
      } else {
        setCurrentPage('public-landing');
      }
    };

    initializeApp();
  }, []);

  // Live polling for dashboard and logs updates
  useEffect(() => {
    if (!currentUser) return;

    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [currentUser, refreshData]);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (!username.trim() || !password) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem('cai_token', data.token);
      setCurrentUser(data.user);
      setCurrentPage(data.user.role === 'admin' ? 'admin-dashboard' : 'operator-checkin');
      return true;
    } catch (error) {
      console.error('Backend login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('cai_token');
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const checkInParticipant = async (id: string, operatorName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/checkin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ participantId: id, sessionId: activeSessionId }),
      });

      const data = await response.json();
      await refreshData();

      return {
        success: data.success,
        message: data.message,
        participant: data.participant
      };
    } catch (error) {
      console.error('Check-in failed:', error);
      return { success: false, message: 'Gagal terhubung dengan server backend.' };
    }
  };

  const checkInByRfid = async (rfidCardId: string, operatorName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/checkin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rfidCardId, sessionId: activeSessionId }),
      });

      const data = await response.json();
      await refreshData();

      return {
        success: data.success,
        message: data.message,
        participant: data.participant
      };
    } catch (error) {
      console.error('RFID check-in failed:', error);
      return { success: false, message: 'Gagal terhubung dengan server backend.' };
    }
  };

  const addParticipant = async (newP: Omit<Participant, 'isCheckedIn'>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newP),
      });

      if (!response.ok) return false;
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed adding participant:', error);
      return false;
    }
  };

  const deleteParticipant = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed deleting participant:', error);
    }
  };

  const updateParticipant = async (updated: Participant) => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${encodeURIComponent(updated.id)}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updated),
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed updating participant:', error);
    }
  };

  const importParticipants = async (newParticipants: Omit<Participant, 'isCheckedIn'>[]): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ participants: newParticipants }),
      });

      if (response.ok) {
        const data = await response.json();
        await refreshData();
        return data.count;
      }
      return 0;
    } catch (error) {
      console.error('Failed importing participants:', error);
      return 0;
    }
  };

  const registerRfid = async (participantId: string, rfidCardId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${encodeURIComponent(participantId)}/register-rfid`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ rfidCardId }),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshData();
        return { success: true, message: data.message || 'RFID berhasil didaftarkan' };
      }
      return { success: false, message: data.message || 'Gagal mendaftarkan RFID' };
    } catch (error) {
      console.error('Failed registering RFID:', error);
      return { success: false, message: 'Gagal terhubung dengan server backend.' };
    }
  };

  const resetAllAttendance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/reset`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed resetting data:', error);
    }
  };

  const fetchSessions = useCallback(async () => {
    const token = localStorage.getItem('cai_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed fetching sessions:', error);
    }
  }, []);

  const upsertSession = async (session: Omit<AttendanceSession, 'id'> & { id?: string }): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(session),
      });
      if (res.ok) {
        await fetchSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed upserting session:', error);
      return false;
    }
  };

  const updateSession = async (id: string, data: Partial<Omit<AttendanceSession, 'id'>>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed updating session:', error);
      return false;
    }
  };

  const deleteSession = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed deleting session:', error);
      return false;
    }
  };

  const fetchDashboard = useCallback(async (sessionId?: string): Promise<DashboardData | null> => {
    const token = localStorage.getItem('cai_token');
    if (!token) return null;
    try {
      const url = sessionId
        ? `${API_BASE_URL}/analytics/dashboard?sessionId=${sessionId}`
        : `${API_BASE_URL}/analytics/dashboard`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (error) {
      console.error('Failed fetching dashboard:', error);
      return null;
    }
  }, []);

  const exportPdfUrl = (sessionId?: string): string => {
    const token = localStorage.getItem('cai_token') || '';
    const base = `${API_BASE_URL}/analytics/export-pdf`;
    const sep = sessionId ? `?sessionId=${sessionId}` : '';
    // Note: browser will navigate to this URL with auth headers via fetch in the dashboard component
    return `${base}${sep}`;
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
      sessions,
      fetchSessions,
      upsertSession,
      updateSession,
      deleteSession,
      fetchDashboard,
      exportPdfUrl,
      activeSessionId,
      setActiveSessionId,
      checkInParticipant,
      checkInByRfid,
      addParticipant,
      deleteParticipant,
      updateParticipant,
      importParticipants,
      registerRfid,
      resetAllAttendance,
      refreshBackendData: refreshData
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
