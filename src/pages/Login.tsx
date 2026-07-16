import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Leaf, Shield, Clock, ArrowRight, CheckCircle2, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('admin');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Nama atau Username wajib diisi!');
      return;
    }

    const success = login(username.trim(), role);
    if (!success) {
      setError('Gagal masuk. Silakan periksa input Anda.');
    }
  };

  const handleQuickLogin = (selectedRole: 'admin' | 'operator') => {
    const defaultUser = selectedRole === 'admin' ? 'admin' : 'budi_cai';
    login(defaultUser, selectedRole);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background organic curves / decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-600/10 border border-blue-500/20"
          >
            <Leaf className="h-10 w-10 fill-blue-500/20" />
          </motion.div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Absensi CAI 2026
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 max-w">
          Cinta Alam Indonesia • Sistem Informasi Presensi Peserta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-xl flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nama Pengguna / Operator ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Masukkan nama atau username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Hak Akses (Role)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                    role === 'admin'
                      ? 'bg-blue-50/50 border-blue-500 text-blue-900 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Shield className={`h-4 w-4 ${role === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
                  Administrator
                </button>

                <button
                  type="button"
                  onClick={() => setRole('operator')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                    role === 'operator'
                      ? 'bg-blue-50/50 border-blue-500 text-blue-900 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className={`h-4 w-4 ${role === 'operator' ? 'text-blue-600' : 'text-slate-400'}`} />
                  Operator Lapangan
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/15 transition-all duration-150 active:scale-95"
              id="login-submit-btn"
            >
              Masuk Aplikasi
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick simulation accounts for testing */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-4">
              Uji Coba Cepat (Sandbox)
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickLogin('admin')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 text-center transition-all group"
                id="quick-login-admin"
              >
                <Shield className="h-4 w-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Admin Mode</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Semua Fitur</span>
              </button>

              <button
                onClick={() => handleQuickLogin('operator')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 text-center transition-all group"
                id="quick-login-operator"
              >
                <Clock className="h-4 w-4 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Operator Mode</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Real-time Scan</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          <span>Sistem Berjalan di Lingkungan Frontend Demo (Mock Active)</span>
        </div>
      </div>
    </div>
  );
};
