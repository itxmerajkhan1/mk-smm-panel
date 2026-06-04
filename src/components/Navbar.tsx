/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { LogOut, Moon, Sun, Wallet, ShieldCheck, Menu, X, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  onOpenQuickDeposit: () => void;
}

export default function Navbar({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onOpenQuickDeposit
}: NavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'new-order', label: 'New Order' },
    { id: 'orders', label: 'Order History' },
    { id: 'services', label: 'Services Pricing' },
    { id: 'add-funds', label: 'Add Funds' },
    { id: 'support', label: 'Support Tickets' },
    { id: 'api', label: 'API Reference' },
    { id: 'profile', label: 'Profile' },
    { id: 'referrals', label: '🎁 Affiliates & Referrals' }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setDrawerOpen(false);
  };

  const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'ACTIVE / ADMIN PLAN';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-black/70 backdrop-blur-md text-zinc-900 dark:text-white transition-colors duration-250">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6 lg:gap-8">
          <div 
            onClick={() => handleTabClick('new-order')}
            className="flex cursor-pointer items-center gap-2 select-none"
            id="brand-logo"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleTabClick('new-order')}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">MK</div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-display">
              MK SMM <span className="text-blue-500 text-sm align-middle font-bold">v3.5</span>
            </span>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Desktop Navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-emerald-400 border border-zinc-200 dark:border-zinc-800'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {tab.id === 'referrals' ? '🎁 Affiliates' : tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Actions Block */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Balance trigger */}
          <button 
            id="nav-balance-trigger"
            onClick={onOpenQuickDeposit}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-[#0a0a0a] px-2.5 sm:px-3.5 py-1 sm:py-1.5 transition-all hover:border-blue-500/30 hover:bg-blue-600/5 cursor-pointer text-left focus:outline-double focus:outline-blue-500"
            title="Click to instantly top up simulation funds!"
            aria-label={`Current balance is ${user.balance.toFixed(2)} dollars. Click to top up.`}
          >
            <Wallet className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex flex-col items-start leading-none min-w-[50px] sm:min-w-[70px]">
              <span className="text-[7.5px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">
                Balance
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-blue-500">
                ${user.balance.toFixed(2)}
              </span>
            </div>
            <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded bg-blue-600 text-[10px] sm:text-xs font-black text-white hover:bg-blue-500 transition-all shrink-0">
              +
            </div>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle theme mode"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-zinc-700" />}
          </button>

          {/* Admin Toggle button (only for Admin / Superadmin) */}
          {isAdmin && (
            <button
              id="nav-admin-toggle"
              onClick={() => handleTabClick(activeTab === 'admin' ? 'new-order' : 'admin')}
              className={`hidden md:flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/5'
                  : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>{activeTab === 'admin' ? 'EXIT ADMIN' : 'ADMIN STATION'}</span>
            </button>
          )}

          {/* Divider */}
          <div className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-800 lg:block"></div>

          {/* Desktop Logged In User Indicator */}
          <div className="hidden items-center gap-2 lg:flex select-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400 font-extrabold text-xs">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">
                {user.username.toUpperCase()}
              </span>
              <span className="text-[7.5px] tracking-widest text-zinc-450 dark:text-zinc-500 uppercase font-bold">
                {user.role} PLAN
              </span>
            </div>
          </div>

          {/* Logout button */}
          <button
            id="nav-logout"
            onClick={onLogout}
            className="hidden lg:block rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Log Out"
            aria-label="Sign out of account"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>

          {/* Mobile Hamburguer switcher */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex lg:hidden rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-expanded={drawerOpen}
            aria-label="Toggle menu"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Glassmorphic Drawer Menu with state animation */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 top-16 z-30 bg-black/50 backdrop-blur-sm lg:hidden h-[calc(100vh-4rem)]"
            />

            {/* Sidebar drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-l border-zinc-200 dark:border-zinc-850 bg-white/95 dark:bg-[#060606]/95 backdrop-blur-lg p-5 flex flex-col justify-between shadow-2xl lg:hidden transition-colors"
            >
              {/* Navigation Tabs List */}
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[70vh] pt-2">
                
                {/* Admin Switcher in Mobile list */}
                {isAdmin && (
                  <button
                    onClick={() => handleTabClick(activeTab === 'admin' ? 'new-order' : 'admin')}
                    className={`flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>{activeTab === 'admin' ? 'EXIT SYSADMIN' : 'ADMIN STATION'}</span>
                  </button>
                )}

                <div className="h-px bg-zinc-250 dark:bg-zinc-850 my-1"></div>

                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-blue-500/10 dark:bg-zinc-900 border border-blue-500/20 dark:border-zinc-800 text-blue-600 dark:text-emerald-400 font-extrabold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:hover:text-white font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Bottom user status and sign-out button */}
              <div className="border-t border-zinc-200 dark:border-zinc-850 pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 select-none">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400 font-extrabold text-xs">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">
                      {user.username.toUpperCase()}
                    </span>
                    <span className="text-[8px] tracking-widest text-zinc-450 dark:text-zinc-500 uppercase font-bold">
                      {user.role} TIER PROFILE
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 hover:bg-red-500/10 dark:bg-zinc-900 hover:text-red-500 dark:text-zinc-400 p-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Log Out of Panel</span>
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
