/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuthContext } from './AuthContext';
import { AlertCircle, Key, Mail, Lock, RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onBackToClient: () => void;
}

export default function AdminLogin({ onBackToClient }: AdminLoginProps) {
  const { loginWithEmail, logout } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorVal, setErrorVal] = useState('');
  const [infoVal, setInfoVal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorVal('');
    setInfoVal('');

    try {
      // Validate email belongs to admin group before or during login attempt
      const cleanEmail = email.trim();
      const isAdminEmail = cleanEmail === 'itxmerajkhan3109@gmail.com' || cleanEmail === 'admin@mksmm.com';
      
      if (!isAdminEmail) {
        throw new Error('Access denied. Non-admin accounts are restricted from the System Administration Console.');
      }

      await loginWithEmail(cleanEmail, password);
      setInfoVal('Administrative access approved. Synchronizing core ledger assets...');
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/user-not-found') message = 'No registered administrator with this credential found.';
      if (err.code === 'auth/wrong-password') message = 'Invalid administrative credentials. Access denied.';
      setErrorVal(message);
    } finally {
      setLoading(false);
    }
  };

  const preloadAdminCreds = () => {
    setEmail('itxmerajkhan3109@gmail.com');
    setPassword('admin123');
    setErrorVal('');
    setInfoVal('Superadmin preview credentials preloaded. Click Initiate System Session.');
  };

  const preloadLegacyAdmin = () => {
    setEmail('admin@mksmm.com');
    setPassword('admin123');
    setErrorVal('');
    setInfoVal('Legacy admin credentials preloaded.');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      {/* Absolute futuristic ambient layers */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-red-650/5 blur-[120px]" id="ambient-admin-back-1"></div>
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-blue-900/5 blur-[120px]" id="ambient-admin-back-2"></div>

      <div className="relative w-full max-w-md" id="admin-auth-container">
        <div className="premium-card p-8 border border-red-950/20 bg-[#070708] shadow-2xl relative rounded-xl">
          
          {/* Header Shield */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-650 font-black text-xl text-white tracking-widest shadow-lg shadow-red-950/40">
              MK
            </div>
            <h1 className="mt-4 font-display text-2xl font-black tracking-tighter italic text-white uppercase leading-none">
              ADMIN CONTROL STATION
            </h1>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 border border-red-500/10">
              <ShieldAlert className="h-3 w-3 text-red-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-red-400">
                SECURE SYSADMIN CORE
              </span>
            </div>
          </div>

          {errorVal && (
            <div className="mb-5 flex gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-500 font-medium" id="admin-auth-error">
              <AlertCircle className="h-4.5 w-4.5 flex-none text-red-500" />
              <span>{errorVal}</span>
            </div>
          )}

          {infoVal && (
            <div className="mb-5 flex gap-2.5 rounded-lg border border-red-500/10 bg-red-500/5 p-3.5 text-xs text-red-400 font-medium" id="admin-auth-info">
              <AlertCircle className="h-4.5 w-4.5 flex-none text-red-400" />
              <span>{infoVal}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-zinc-550">
                Admin Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-650" />
                <input
                  id="admin-input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mksmm.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-zinc-850 bg-[#0d0d0e] text-sm text-white placeholder-zinc-850 outline-none transition-all focus:border-red-650 focus:bg-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-zinc-550">
                Admin Security Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-650" />
                <input
                  id="admin-input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-zinc-850 bg-[#0d0d0e] text-sm text-white placeholder-zinc-850 outline-none transition-all focus:border-red-650 focus:bg-black"
                />
              </div>
            </div>

            <button
              id="admin-btn-submit"
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-red-650 hover:bg-red-550 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-950/20 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  AUTHENTICATING ADMIN SECURITY...
                </>
              ) : (
                'INITIATE SYSTEM SESSION'
              )}
            </button>
          </form>

          {/* Action links */}
          <div className="mt-5 flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase pt-4 border-t border-zinc-900">
            <button
              onClick={onBackToClient}
              className="flex items-center gap-1.5 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              Client Portal Entrance
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-zinc-900/50">
            <span className="block text-center text-[8px] font-black uppercase tracking-widest text-red-500/70 mb-3">
              ⚡ EMULATED ADMINISTRATOR KEYSETS
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="admin-quick-itxmeraj"
                onClick={preloadAdminCreds}
                className="flex flex-col items-start rounded border border-zinc-900 bg-red-950/5 hover:bg-[#100b0c] hover:border-red-950/25 p-2.5 text-left transition-all"
              >
                <span className="text-[10px] font-display font-black text-white">Superadmin</span>
                <span className="text-[7.5px] font-mono text-zinc-650 overflow-hidden text-ellipsis w-full">itxmerajkhan3109@gmail.com</span>
              </button>
              <button
                type="button"
                id="admin-quick-mksmm"
                onClick={preloadLegacyAdmin}
                className="flex flex-col items-start rounded border border-zinc-900 bg-zinc-950/80 hover:bg-[#121213] hover:border-zinc-800 p-2.5 text-left transition-all"
              >
                <span className="text-[10px] font-display font-black text-white">Legacy Admin</span>
                <span className="text-[7.5px] font-mono text-zinc-650 overflow-hidden text-ellipsis w-full">admin@mksmm.com</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
