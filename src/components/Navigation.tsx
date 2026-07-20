import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageId } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  RefreshCw,
  Sliders,
  Shield,
  Clock,
  CreditCard
} from 'lucide-react';
import logoImg from '../../assets/image/logo_cai_putih.png';

export const Navigation: React.FC = () => {
  const { currentUser, currentPage, setCurrentPage, logout, resetAllAttendance } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser || currentPage === 'login') return null;

  const role = currentUser.role;

  const navItems = [
    {
      id: 'operator-checkin' as PageId,
      label: 'Real-time Check-In',
      icon: QrCode,
      roles: ['operator', 'admin'],
      description: 'Scan & log attendance'
    },
    {
      id: 'admin-dashboard' as PageId,
      label: 'Analytics Dashboard',
      icon: LayoutDashboard,
      roles: ['admin'],
      description: 'Stats & live visualizers'
    },
    {
      id: 'admin-participants' as PageId,
      label: 'Participant Management',
      icon: Users,
      roles: ['admin'],
      description: 'Manage & import CSV'
    },
    {
      id: 'admin-idcard' as PageId,
      label: 'Cetak ID Card',
      icon: CreditCard,
      roles: ['admin'],
      description: 'Generate & download ID card'
    }
  ].filter(item => item.roles.includes(role));

  const handleNavigate = (pageId: PageId) => {
    setCurrentPage(pageId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Logo CAI" className="h-8 w-auto" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">Administrasi CAI</h1>
            <span className="text-[9px] font-mono text-blue-400 font-medium tracking-wide uppercase">Cinta Alam Indonesia</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            aria-label="Toggle Menu"
            id="mobile-menu-btn"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-950 border-r border-slate-900 fixed top-0 bottom-0 left-0 z-30 h-full">
        {/* Brand Header */}
        <div className="h-20 border-b border-slate-900 px-6 flex items-center gap-3 bg-slate-950">
          <img src={logoImg} alt="Logo CAI" className="h-10 w-auto" />
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">Administrasi CAI</h1>
            <span className="text-[10px] font-mono text-blue-400 font-semibold tracking-wider uppercase">Cinta Alam Indonesia</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto bg-slate-950/95">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Menu Utama</span>
          </div>
          
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                id={`nav-${item.id}`}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 text-left group relative ${
                  isActive 
                    ? 'bg-slate-900 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-lg"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`h-5 w-5 shrink-0 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                }`} />
                <div>
                  <div className="text-sm font-semibold leading-tight">{item.label}</div>
                  <div className={`text-[11px] font-normal leading-normal mt-0.5 ${
                    isActive ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'
                  }`}>{item.description}</div>
                </div>
              </button>
            );
          })}

          {/* Quick Sandbox Tools */}
          <div className="pt-6 border-t border-slate-900 mt-6 px-3">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase flex items-center gap-1.5 mb-2">
              <Sliders className="h-3 w-3 text-slate-500" /> Sandbox Simulator
            </span>
            <div className="space-y-1.5 pt-1">
              <button
                onClick={resetAllAttendance}
                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left font-semibold"
                id="reset-attendance-btn"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-hover" />
                Reset Absensi ke Mock
              </button>
            </div>
          </div>
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-900 bg-slate-950">
          <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl mb-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold font-sans text-sm shadow-md shadow-blue-500/10">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate leading-none mb-1.5">{currentUser.name}</p>
              <div className="flex items-center gap-1">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase leading-none ${
                  role === 'admin' 
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                }`}>
                  {role === 'admin' ? (
                    <>
                      <Shield className="h-2 w-2 mr-0.5" /> ADMIN
                    </>
                  ) : (
                    <>
                      <Clock className="h-2 w-2 mr-0.5" /> OPERATOR
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-300 text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 border border-slate-800"
            id="logout-btn"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            Keluar Aplikasi
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950 z-40 lg:hidden"
            />

            {/* Sidebar content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-slate-950 z-50 shadow-2xl flex flex-col h-full lg:hidden"
            >
              <div className="h-16 border-b border-slate-900 px-4 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2">
                  <img src={logoImg} alt="Logo CAI" className="h-8 w-auto" />
                  <div>
                    <h1 className="text-sm font-bold text-white leading-none">Administrasi CAI</h1>
                    <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wide">Cinta Alam Indonesia</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                <div className="px-2 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Navigasi</span>
                </div>

                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-slate-900 text-white font-semibold' 
                          : 'text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${
                        isActive ? 'text-blue-400' : 'text-slate-500'
                      }`} />
                      <div className="text-left">
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className={`text-[10px] font-normal ${
                          isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}>{item.description}</div>
                      </div>
                    </button>
                  );
                })}

                <div className="pt-4 border-t border-slate-900 mt-4 px-2">
                  <button
                    onClick={() => {
                      resetAllAttendance();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 py-2 text-xs text-rose-400 font-semibold hover:bg-rose-500/10 rounded-lg text-left"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset Absensi ke Mock
                  </button>
                </div>
              </nav>

              {/* Profile Footer */}
              <div className="p-4 border-t border-slate-900 bg-slate-950">
                <div className="flex items-center gap-3 p-2 bg-slate-900/50 border border-slate-850 rounded-xl mb-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate leading-none mb-1">{currentUser.name}</p>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      {role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Keluar Aplikasi
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
