/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { Login } from './pages/Login';
import { OperatorCheckIn } from './pages/OperatorCheckIn';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminParticipants } from './pages/AdminParticipants';
import { AdminIdCard } from './pages/AdminIdCard';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { currentUser, currentPage } = useApp();

  // If there's no user logged in or we are on login page, force login screen
  if (!currentUser || currentPage === 'login') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="login-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Login />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Render Page based on State
  const renderPage = () => {
    switch (currentPage) {
      case 'operator-checkin':
        return <OperatorCheckIn />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-participants':
        return <AdminParticipants />;
      case 'admin-idcard':
        return <AdminIdCard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Global Sidebar / Drawer Navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 min-h-screen flex flex-col relative">
        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="h-full w-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Humble, Professional Footer */}
        <footer className="py-6 px-8 border-t border-slate-200/50 bg-white/50 text-center text-[10px] font-mono text-slate-400">
          <span>Absensi CAI © 2026 • Dirancang untuk Kerapihan & Presisi Presensi Lapangan</span>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
