/**
 * Code license: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import AdminLogin from './components/AdminLogin';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { useAuthContext } from './components/AuthContext';
import { 
  LayoutGrid, ShoppingCart, FileSpreadsheet, ClipboardList, Layers, Wallet, 
  Server, Award, HelpCircle, Code, User, LogOut, Menu, X, ChevronLeft, 
  ChevronRight, ShieldCheck, Sun, Moon, RefreshCw, Bell, Globe, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, convertCurrency } from './utils/currency';

export default function App() {
  const { 
    firebaseUser, 
    userProfile, 
    loadingProfile, 
    logout, 
    refreshProfile 
  } = useAuthContext();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [token, setToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true); // default to glorious dark theme

  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('mk_smm_sidebar_collapsed');
    return saved !== 'true';
  });

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('mk_smm_currency') || 'PKR';
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickDepositCount, setQuickDepositCount] = useState(0);
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Capture SMM affiliate referral parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
      localStorage.setItem('mk_smm_referrer', refParam);
      console.log(`Captured referral: ${refParam}`);
    }
  }, []);

  // Sync token when Firebase Auth changes
  useEffect(() => {
    async function updateToken() {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
        } catch (e) {
          console.error("Error retrieving ID Token:", e);
        }
      } else {
        setToken(null);
      }
    }
    updateToken();
  }, [firebaseUser]);

  // Keep dark class synced
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Save sidebar preferences
  useEffect(() => {
    localStorage.setItem('mk_smm_sidebar_collapsed', (!sidebarExpanded).toString());
  }, [sidebarExpanded]);

  // Save selected currency switcher choice
  useEffect(() => {
    localStorage.setItem('mk_smm_currency', currency);
  }, [currency]);

  // Browser Navigation Hooks
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Enforce access control and roles
  useEffect(() => {
    if (loadingProfile) return;

    if (firebaseUser && userProfile) {
      const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin';
      
      if (isAdmin) {
        if (currentPath === '/' || currentPath === '/dashboard' || currentPath === '/login' || currentPath === '/admin/login') {
          setActiveTab('admin');
          navigate('/admin/dashboard');
        } else if (currentPath === '/admin/dashboard') {
          setActiveTab('admin');
        } else {
          const tabPart = currentPath.substring(1);
          if (['dashboard', 'new-order', 'mass-order', 'orders', 'services', 'add-funds', 'child-panel', 'referrals', 'support', 'api', 'profile'].includes(tabPart)) {
            setActiveTab(tabPart);
          }
        }
      } else {
        if (currentPath === '/' || currentPath === '/admin/dashboard' || currentPath === '/login' || currentPath === '/admin/login') {
          setActiveTab('dashboard');
          navigate('/dashboard');
        } else {
          const tabPart = currentPath.substring(1);
          if (['dashboard', 'new-order', 'mass-order', 'orders', 'services', 'add-funds', 'child-panel', 'referrals', 'support', 'api', 'profile'].includes(tabPart)) {
            setActiveTab(tabPart);
          }
        }
      }
    } else {
      if (currentPath !== '/admin/login' && currentPath !== '/admin/dashboard' && currentPath !== '/login' && currentPath !== '/') {
        navigate('/login');
      }
    }
  }, [firebaseUser, userProfile, currentPath, loadingProfile]);

  // Sync state tab to URL
  useEffect(() => {
    if (!firebaseUser || !userProfile) return;
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin';
    if (isAdmin && activeTab === 'admin') {
      if (currentPath !== '/admin/dashboard') {
        navigate('/admin/dashboard');
      }
    } else {
      if (currentPath !== `/${activeTab}`) {
        navigate(`/${activeTab}`);
      }
    }
  }, [activeTab, firebaseUser, userProfile]);

  const handleTriggerQuickDeposit = () => {
    setQuickDepositCount(prev => prev + 1);
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="font-display font-medium text-xs text-zinc-650 uppercase tracking-widest leading-none">
            Establishing Secured SMM Cloud Tunnel...
          </span>
        </div>
      </div>
    );
  }

  const isLogged = firebaseUser && userProfile;
  const isAdminUser = userProfile && (userProfile.role === 'admin' || userProfile.role === 'superadmin');

  // Unified responsive sidebar items list
  const sidebarTabs = [
    { id: 'dashboard', label: 'Monitor Desk', icon: LayoutGrid },
    { id: 'new-order', label: 'New Order', icon: ShoppingCart },
    { id: 'mass-order', label: 'Mass Compiler', icon: FileSpreadsheet },
    { id: 'orders', label: 'Order History', icon: ClipboardList },
    { id: 'services', label: 'Pricing Desk', icon: Layers },
    { id: 'add-funds', label: 'Funds & Wallet', icon: Wallet },
    { id: 'child-panel', label: 'Reseller Node', icon: Server },
    { id: 'referrals', label: 'Partnership', icon: Award },
    { id: 'support', label: 'Support Ticket', icon: HelpCircle },
    { id: 'api', label: 'Developer API', icon: Code },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  const handleSidebarTabClick = (id: string) => {
    setActiveTab(id);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen transition-all bg-black text-zinc-100 selection:bg-blue-600 selection:text-white">
      
      {!isLogged ? (
        currentPath === '/admin/login' || currentPath === '/admin/dashboard' ? (
          <AdminLogin onBackToClient={() => navigate('/login')} />
        ) : (
          <Auth />
        )
      ) : (
        <div className="flex min-h-screen bg-black">
          
          {/* ================= DESKTOP INTERACTIVE SIDEBAR ================= */}
          <aside 
            className={`hidden lg:flex flex-col z-40 border-r border-zinc-900 bg-[#060608] transition-all duration-300 ${
              sidebarExpanded ? 'w-64' : 'w-20'
            }`}
          >
            {/* Logo area */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-900 bg-black/40">
              <div 
                onClick={() => handleSidebarTabClick('dashboard')}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow shadow-blue-500/25 shrink-0">
                  MK
                </div>
                {sidebarExpanded && (
                  <span className="font-display text-sm font-black tracking-wider uppercase text-white">
                    MK PANEL <span className="text-[9px] text-blue-500 font-bold">X3</span>
                  </span>
                )}
              </div>
              
              <button
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="p-1 rounded bg-zinc-950 border border-zinc-900 hover:border-blue-500/30 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                {sidebarExpanded ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
              {sidebarTabs.map((button) => {
                const IconComp = button.icon;
                const isSelected = activeTab === button.id;
                return (
                  <button
                    key={button.id}
                    onClick={() => handleSidebarTabClick(button.id)}
                    className={`flex items-center w-full rounded-xl py-2.5 transition-all text-left group cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-650/10 border border-blue-500/15 text-blue-400 font-extrabold shadow shadow-blue-500/5'
                        : 'text-zinc-400 hover:bg-zinc-950 hover:text-white border border-transparent'
                    } ${sidebarExpanded ? 'px-4 gap-3.5' : 'justify-center'}`}
                    title={button.label}
                  >
                    <IconComp className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                      isSelected ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-350'
                    }`} />
                    {sidebarExpanded && (
                      <span className="text-[11px] font-bold uppercase tracking-wider">{button.label}</span>
                    )}
                  </button>
                );
              })}

              {/* Admin Toggle in Desktop Sidebar if applicable */}
              {isAdminUser && (
                <div className="pt-4 border-t border-zinc-900 mt-4 space-y-1">
                  <button
                    onClick={() => handleSidebarTabClick(activeTab === 'admin' ? 'dashboard' : 'admin')}
                    className={`flex items-center w-full rounded-xl py-2.5 transition-all text-left font-black tracking-wider cursor-pointer border ${
                      activeTab === 'admin'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/15'
                    } ${sidebarExpanded ? 'px-4 gap-3.5' : 'justify-center'}`}
                    title="Control Station"
                  >
                    <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                    {sidebarExpanded && (
                      <span className="text-[11px] uppercase">{activeTab === 'admin' ? 'CLIENT CONSOLE' : 'ADMIN STATION'}</span>
                    )}
                  </button>
                </div>
              )}
            </nav>

            {/* Bottom logout area */}
            <div className="p-4 border-t border-zinc-900 bg-black/20">
              <button
                onClick={logout}
                className={`flex items-center w-full rounded-xl py-2.5 hover:bg-red-950/20 border border-transparent hover:border-red-900/20 text-zinc-500 hover:text-red-400 transition-all cursor-pointer ${
                  sidebarExpanded ? 'px-4 gap-3.5' : 'justify-center'
                }`}
                title="Log Out Profile"
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" />
                {sidebarExpanded && <span className="text-[11px] font-bold uppercase tracking-wider">Sign Out</span>}
              </button>
            </div>
          </aside>

          {/* ================= RIGHT WORK CANVAS ================= */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#020202] relative">
            
            {/* Core Header Ribbon */}
            <header className="sticky top-0 z-35 h-16 border-b border-zinc-900/60 bg-black/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 select-none">
              
              {/* Left Breadcrumb & Mobile menu trigger */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  className="flex lg:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
                >
                  <Menu className="h-5 w-5" />
                </button>
                
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
                  <span className="text-zinc-550 font-black">MK_CONSOLE</span>
                  <span className="text-zinc-700">/</span>
                  <span className="text-blue-400 font-extrabold uppercase tracking-wide">
                    {activeTab === 'admin' ? 'sysadmin_ledger' : activeTab.replace('-', '_')}
                  </span>
                </div>
              </div>

              {/* Right panel tools: switcher, wallet tracker, profile status */}
              <div className="flex items-center gap-3">

                {/* SMM Real Currency Switcher */}
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded-lg p-1">
                  {(['PKR', 'USD', 'EUR', 'GBP'] as const).map((currCode) => (
                    <button
                      key={currCode}
                      onClick={() => setCurrency(currCode)}
                      className={`px-2 py-0.5 text-[8.5px] font-black tracking-wider uppercase rounded transition-colors cursor-pointer ${
                        currency === currCode 
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {currCode}
                    </button>
                  ))}
                </div>

                {/* Real Live Wallet Balance indicator */}
                <button 
                  onClick={handleTriggerQuickDeposit}
                  className="flex items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950 px-2.5 sm:px-3 py-1.5 transition-all hover:bg-blue-650/5 hover:border-blue-500/20 cursor-pointer"
                >
                  <Wallet className="h-3.5 w-3.5 text-blue-500" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[7.5px] uppercase text-zinc-550 font-black tracking-widest">Balance</span>
                    <span className="font-mono text-xs font-black text-blue-400 mt-0.5">
                      {formatCurrency(convertCurrency(userProfile!.balance, 'USD', currency), currency)}
                    </span>
                  </div>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-zinc-400" />}
                </button>

                {/* Profile indicator */}
                <div onClick={() => setActiveTab('profile')} className="hidden md:flex items-center gap-2 cursor-pointer bg-zinc-950/40 border border-zinc-900/60 p-1.5 rounded-lg select-none hover:bg-zinc-950 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                    {userProfile!.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-extrabold uppercase">{userProfile!.username}</span>
                </div>

              </div>

            </header>

            {/* Main scrollable body panel */}
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === 'admin' && isAdminUser ? (
                    <AdminDashboard 
                      token={token || ''} 
                      currentUser={userProfile!}
                      onRefreshUser={refreshProfile} 
                    />
                  ) : (
                    <Dashboard 
                      user={userProfile!} 
                      token={token || ''} 
                      activeTab={activeTab} 
                      setActiveTab={setActiveTab} 
                      onRefreshUser={refreshProfile}
                      quickDepositTrigger={quickDepositCount}
                      currency={currency}
                      setCurrency={setCurrency}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

            </main>

            {/* Minimal footer line */}
            <footer className="h-12 border-t border-zinc-900/60 bg-black/20 flex items-center justify-between px-6 text-[10px] text-zinc-650 font-mono select-none">
              <span>&copy; {new Date().getFullYear()} MK SMM Enterprise. Standard integration mode.</span>
              <span className="hidden sm:inline">Active Nodes synced via Firestore socket logs</span>
            </footer>

          </div>

          {/* ================= MOBILE BOTTOM DRAWER MENU ================= */}
          <AnimatePresence>
            {mobileDrawerOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden h-screen"
                />

                {/* Left side drawer */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  className="fixed left-0 top-0 bottom-0 z-55 h-screen w-72 bg-[#060608] border-r border-zinc-900 p-5 flex flex-col justify-between shadow-2xl lg:hidden"
                >
                  <div className="space-y-6">
                    {/* Header profile area */}
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">MK</div>
                        <span className="font-display font-black text-xs uppercase text-white">MK Enterprise</span>
                      </div>
                      <button
                        onClick={() => setMobileDrawerOpen(false)}
                        className="p-1 rounded bg-zinc-950 text-zinc-550 border border-zinc-900 hover:text-white"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Navigation buttons */}
                    <nav className="space-y-1 overflow-y-auto max-h-[70vh] pr-1">
                      {sidebarTabs.map((button) => {
                        const IconComp = button.icon;
                        const isSelected = activeTab === button.id;
                        return (
                          <button
                            key={button.id}
                            onClick={() => handleSidebarTabClick(button.id)}
                            className={`flex items-center gap-3.5 w-full rounded-xl py-2.5 px-4 transition-all text-left uppercase text-[10px] tracking-wider font-extrabold cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-650/15 border border-blue-500/15 text-blue-400'
                                : 'text-zinc-400 hover:bg-zinc-950 hover:text-white border border-transparent'
                            }`}
                          >
                            <IconComp className="h-4.5 w-4.5 shrink-0 text-zinc-500" />
                            <span>{button.label}</span>
                          </button>
                        );
                      })}

                      {/* Admin panel mobile button */}
                      {isAdminUser && (
                        <div className="border-t border-zinc-900 pt-3 mt-3">
                          <button
                            onClick={() => handleSidebarTabClick(activeTab === 'admin' ? 'dashboard' : 'admin')}
                            className={`flex items-center gap-3.5 w-full rounded-xl py-2.5 px-4 border text-[10px] tracking-wider font-black uppercase transition-all cursor-pointer ${
                              activeTab === 'admin'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                            }`}
                          >
                            <ShieldCheck className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
                            <span>{activeTab === 'admin' ? 'CLIENT CONSOLE' : 'ADMIN STATION'}</span>
                          </button>
                        </div>
                      )}
                    </nav>
                  </div>

                  {/* Mobile footer logout */}
                  <div className="border-t border-zinc-900 pt-4">
                    <button
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        logout();
                      }}
                      className="flex items-center justify-center gap-2.5 w-full rounded-xl py-2.5 text-center bg-red-950/15 border border-red-900/15 text-red-400 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4.5 w-4.5" />
                      <span>LOGOUT SMM ACCOUNT</span>
                    </button>
                  </div>

                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
