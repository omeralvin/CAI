import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Participant, CheckInLog, User, PageId } from '../types';

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  checkInLogs: CheckInLog[];
  checkInParticipant: (id: string, operatorName: string) => Promise<{ success: boolean; message: string; participant?: Participant }>;
  checkInByRfid: (rfidCardId: string, operatorName: string) => Promise<{ success: boolean; message: string; participant?: Participant }>;
  addParticipant: (participant: Omit<Participant, 'isCheckedIn'>) => Promise<boolean>;
  deleteParticipant: (id: string) => Promise<void>;
  updateParticipant: (participant: Participant) => Promise<void>;
  importParticipants: (newParticipants: Omit<Participant, 'isCheckedIn'>[]) => Promise<number>;
  resetAllAttendance: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:5050/api';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>('login');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>([]);

  // Helper to fetch authorization headers
  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('cai_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, []);

  // Fetch participants and logs from server
  const refreshData = useCallback(async () => {
    const token = localStorage.getItem('cai_token');
    if (!token) return;

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [partsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/participants`, { headers }),
        fetch(`${API_BASE_URL}/checkin/logs`, { headers })
      ]);

      if (partsRes.ok) {
        const partsData = await partsRes.json();
        setParticipants(partsData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setCheckInLogs(logsData);
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
        setCurrentPage('login');
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
        body: JSON.stringify({ participantId: id }),
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
        body: JSON.stringify({ rfidCardId }),
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
      const response = await fetch(`${API_BASE_URL}/participants/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/participants/${updated.id}`, {
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
      checkInByRfid,
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
