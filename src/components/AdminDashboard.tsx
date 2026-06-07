/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Service, Order, Ticket, AdminStats, Category, Provider, AuditLog, PanelSettings, Transaction 
} from '../types';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { 
  Users, DollarSign, Layers, Ticket as TicketIcon, RefreshCw, 
  Send, Plus, Trash2, Edit3, ShieldAlert, CheckCircle2, AlertCircle, ShoppingBag,
  Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, 
  BarChart3, Settings, ShieldAlert as AuditIcon, Radio, ListPlus, Globe, Loader2, Play, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface AdminDashboardProps {
  token: string;
  currentUser: User;
  onRefreshUser: () => void;
}

type AdminTab = 'overview' | 'users' | 'services' | 'categories' | 'providers' | 'orders' | 'payments' | 'tickets' | 'analytics' | 'audit' | 'settings';

export default function AdminDashboard({ token, currentUser, onRefreshUser }: AdminDashboardProps) {
  // Navigation
  const [tab, setTab] = useState<AdminTab>('overview');

  // Analytics states
  const [analytics, setAnalytics] = useState<any>(null);
  const [reportRange, setReportRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Lists and Data State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Global search, filter, and pagination
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & Action inputs
  const [feedback, setFeedback] = useState({ msg: '', type: 'success' });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Forms
  const [svcForm, setSvcForm] = useState({ category: '', name: '', rate: '', min: '50', max: '10000', description: '' });
  const [catForm, setCatForm] = useState({ name: '', icon: 'Instagram', active: true });
  const [provForm, setProvForm] = useState({ name: '', apiType: 'smm' as const, url: '', apiKey: '', balance: '0', active: true });
  const [settingsForm, setSettingsForm] = useState({ 
    panelName: '', 
    currency: 'USD', 
    minDeposit: 5, 
    maxDeposit: 10000, 
    maintenanceMode: false, 
    autoSyncServices: false, 
    autoSyncIntervalHours: 6,
    markupPercent: 0,
    markupFixed: 0
  });
  const [fundsForm, setFundsForm] = useState({ username: '', amount: '', method: 'Stripe' });
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [adminNotesInput, setAdminNotesInput] = useState<Record<string, string>>({});

  // Sync everything
  const isLoading = React.useRef(false);
  const fetchAllData = React.useCallback(async () => {
    if (isLoading.current) return;
    isLoading.current = true;
    setLoading(true);
    setFeedback({ msg: '', type: 'success' });
    try {
      // Execute all queries in parallel
      const [
        usersSnap, ordersSnap, svcsSnap, ticketsSnap, 
        catsSnap, provsSnap, settingsSnap, logsSnap, txsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'services')),
        getDocs(query(collection(db, 'tickets'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'categories'))),
        getDocs(collection(db, 'providers')),
        getDocs(collection(db, 'settings')),
        getDocs(query(collection(db, 'logs'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')))
      ]);

      setUsers(usersSnap.docs.map(d => ({id: d.id, ...d.data()}) as User));
      setOrders(ordersSnap.docs.map(d => ({id: d.id, ...d.data()}) as Order));
      setServices(svcsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Service));
      setTickets(ticketsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Ticket));
      setCategories(catsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Category));
      setProviders(provsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Provider));
      setAuditLogs(logsSnap.docs.map(d => ({id: d.id, ...d.data()}) as AuditLog));
      setTransactions(txsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Transaction));

      if (settingsSnap.docs.length > 0) {
        const settingsData = { ...settingsSnap.docs[0].data() } as PanelSettings;
        setSettings(settingsData);
        setSettingsForm({
          panelName: settingsData.panelName,
          currency: settingsData.currency || 'USD',
          minDeposit: settingsData.minDeposit || 5,
          maxDeposit: settingsData.maxDeposit || 10000,
          maintenanceMode: !!settingsData.maintenanceMode,
          autoSyncServices: !!settingsData.autoSyncServices,
          autoSyncIntervalHours: settingsData.autoSyncIntervalHours || 6,
          markupPercent: settingsData.markupPercent || 0,
          markupFixed: settingsData.markupFixed || 0
        });
      }

      // Calculate stats based on loaded data
      setStats({
        totalUsers: usersSnap.docs.length,
        activeUsers: usersSnap.docs.filter(d => (d.data() as User).status === 'active').length,
        totalOrders: ordersSnap.docs.length,
        pendingOrders: ordersSnap.docs.filter(o => (o.data() as Order).status === 'pending').length,
        totalProfit: ordersSnap.docs.reduce((acc, o) => acc + ( (o.data() as Order).charge || 0) * 0.35, 0),
        openTickets: ticketsSnap.docs.filter(t => (t.data() as Ticket).status === 'open').length,
      });
    } catch (err) {
      console.error(err);
      triggerFeedback('Could not fetch synchronized data.', 'all');
    } finally {
      setLoading(false);
      isLoading.current = false;
    }
  }, []); // Stable dependency array

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [fetchAllData]);

  const triggerFeedback = (msg: string, type: 'success' | 'error' | 'all' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback({ msg: '', type: 'success' }), 5000);
  };

  // CSV Generator
  const handleExportCSV = (type: 'users' | 'orders' | 'transactions') => {
    let headersArr: string[] = [];
    let rowsArr: any[] = [];
    let fileName = `export-${type}.csv`;

    if (type === 'users') {
      headersArr = ['ID', 'Username', 'Email', 'Role', 'Balance ($)', 'Status', 'Registered At'];
      rowsArr = users.map(u => [u.id, u.username, u.email, u.role, u.balance, u.status, u.createdAt]);
    } else if (type === 'orders') {
      headersArr = ['Order ID', 'UserId', 'Service ID', 'Link', 'Qty', 'Charge', 'Status', 'Date'];
      rowsArr = orders.map(o => [o.id, o.userId, o.serviceId, o.link, o.quantity, o.charge, o.status, o.createdAt]);
    } else {
      headersArr = ['TX ID', 'User ID', 'Amount', 'Method', 'Status', 'Date'];
      rowsArr = transactions.map(t => [t.id, t.userId, t.amount, t.method, t.status, t.createdAt]);
    }

    const csvContent = [
      headersArr.join(','),
      ...rowsArr.map(row => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerFeedback(`Direct spreadsheet CSV export file for [${type}] downloaded!`);
  };

  // Administrative actions
  const handleModifyBalance = async (userId: string) => {
    const balance = parseFloat(balanceInput);
    if (isNaN(balance) || balance < 0) return triggerFeedback('Enter a valid numeric balance limit ($)', 'error');
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { balance });
      triggerFeedback('Consumer wallet balance set successfully');
      setSelectedUserId(null);
      setBalanceInput('');
      await fetchAllData();
      onRefreshUser();
    } catch {
      triggerFeedback('Firestore update failed', 'error');
    }
  };

  const handleToggleSuspension = async (userId: string, currentStatus: string) => {
    const status = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status });
      triggerFeedback(`User account status modified to [${status}] successfully`);
      await fetchAllData();
    } catch {
      triggerFeedback('Change status failed', 'error');
    }
  };

  // Create Service / Category / Provider / Payments Injection
  const handleCreateSvc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcForm.name || !svcForm.rate) return triggerFeedback('All pricing matrix fields are required.', 'error');
    try {
      const resp = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: svcForm.category || categories[0]?.name || 'Instagram - Followers',
          name: svcForm.name,
          rate: parseFloat(svcForm.rate),
          min: parseInt(svcForm.min),
          max: parseInt(svcForm.max),
          description: svcForm.description
        })
      });
      if (resp.ok) {
        triggerFeedback('Live SMM service catalog node created successfully!');
        setSvcForm({ category: '', name: '', rate: '', min: '50', max: '10000', description: '' });
        fetchAllData();
      }
    } catch {
      triggerFeedback('Creation failed', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return triggerFeedback('Category name is mandatory', 'error');
    try {
      const resp = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(catForm)
      });
      if (resp.ok) {
        triggerFeedback('New categoric routing tag spawned');
        setCatForm({ name: '', icon: 'Layers', active: true });
        fetchAllData();
      }
    } catch {
      triggerFeedback('Category addition failed', 'error');
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provForm.name || !provForm.url || !provForm.apiKey) return triggerFeedback('Complete configuration entries, credentials required.', 'error');
    try {
      const resp = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...provForm,
          balance: parseFloat(provForm.balance)
        })
      });
      if (resp.ok) {
        triggerFeedback('Provider connection established!');
        setProvForm({ name: '', apiType: 'smm', url: '', apiKey: '', balance: '0', active: true });
        fetchAllData();
      }
    } catch {
      triggerFeedback('Connection configuration failed', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settingsForm)
      });
      if (resp.ok) {
        triggerFeedback('Global settings updated and committed to Firestore backend.');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Could not write global variables.', 'error');
    }
  };

  const handleManualPaymentInject = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(fundsForm.amount);
    if (!fundsForm.username || isNaN(amountVal) || amountVal <= 0) {
      return triggerFeedback('Supply correct customer query ID and decimal cash limits.', 'error');
    }
    const victim = users.find(u => u.username.toLowerCase() === fundsForm.username.toLowerCase() || u.id === fundsForm.username);
    if (!victim) return triggerFeedback('Consumer user query matching identifier not found', 'error');

    try {
      const resp = await fetch('/api/funds/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: victim.id, amount: amountVal, method: fundsForm.method })
      });
      if (resp.ok) {
        triggerFeedback(`Loaded $${amountVal.toFixed(2)} USD ledger entry directly on ${victim.username}`);
        setFundsForm({ username: '', amount: '', method: 'Stripe' });
        fetchAllData();
        onRefreshUser();
      }
    } catch {
      triggerFeedback('Payment ledger injection failed.', 'error');
    }
  };

  const handleProcessTransaction = async (txId: string, status: 'completed' | 'failed') => {
    try {
      const notes = adminNotesInput[txId] || '';
      const resp = await fetch(`/api/admin/transactions/${txId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, adminNotes: notes || 'Processed by Administrator' })
      });
      if (resp.ok) {
        triggerFeedback(`Transaction #${txId} status saved successfully as ${status}!`);
        // clear note input for this tx
        setAdminNotesInput(prev => {
          const updated = { ...prev };
          delete updated[txId];
          return updated;
        });
        fetchAllData();
        onRefreshUser();
      } else {
        const data = await resp.json();
        triggerFeedback(data.error || 'Failed to update transaction', 'error');
      }
    } catch {
      triggerFeedback('Network error while processing transaction', 'error');
    }
  };

  // Support thread responses
  const handleTicketReplyAndCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMsg.trim() || !activeTicketId) return;
    try {
      const resp = await fetch(`/api/tickets/${activeTicketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: replyMsg })
      });
      if (resp.ok) {
        setReplyMsg('');
        triggerFeedback('SMM Response dispatch message loaded.');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Dispatch reply failed', 'error');
    }
  };

  const handleCloseTicketId = async (id: string) => {
    try {
      const resp = await fetch(`/api/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'closed' })
      });
      if (resp.ok) {
        triggerFeedback('Closed active conversation thread.');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Failed resolving support ticket.', 'error');
    }
  };

  const handleQuicksetOrderStatus = async (id: string, status: string) => {
    try {
      const resp = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (resp.ok) {
        triggerFeedback(`Service node order ${id} marked [${status}]`);
        fetchAllData();
      }
    } catch {
      triggerFeedback('Status update rejected.', 'error');
    }
  };

  const handleOrderRefillAPI = async (id: string) => {
    try {
      const resp = await fetch(`/api/orders/${id}/refill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        triggerFeedback('Vantage delivery order refill re-triggered instantly.');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Refill request connection error.', 'error');
    }
  };

  const handleOrderCancelAPI = async (id: string) => {
    try {
      const resp = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        triggerFeedback('Order cancelled with remaining credit refunded back to SMM Wallet.');
        fetchAllData();
      } else {
        const errorData = await resp.json();
        triggerFeedback(errorData.error || 'Cancel rejected.', 'error');
      }
    } catch {
      triggerFeedback('Connection failed.', 'error');
    }
  };

  // Delete helpers
  const [syncingServices, setSyncingServices] = useState(false);

  const handleSyncServices = async (providerId?: string) => {
    setSyncingServices(true);
    triggerFeedback('Initializing remote SMM active provider catalogs sync...', 'success');
    try {
      const resp = await fetch('/api/admin/services/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ providerId })
      });
      const data = await resp.json();
      if (resp.ok) {
        triggerFeedback(`Catalog Synchronized! Added ${data.added} new, updated ${data.updated}, disabled ${data.disabled} missing.`);
        fetchAllData();
      } else {
        triggerFeedback(data.error || 'Synchronization failed', 'error');
      }
    } catch {
      triggerFeedback('Network connection error while syncing.', 'error');
    } finally {
      setSyncingServices(false);
    }
  };

  const handlePurgeService = async (id: string) => {
    if (!confirm('Purge this catalog service forever?')) return;
    try {
      const resp = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        triggerFeedback('Service node deleted and removed from client dashboards');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Deletion rejected.', 'error');
    }
  };

  const handlePurgeCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Category permanently?')) return;
    try {
      const resp = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        triggerFeedback('Categoric routing node deleted.');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Deletion rejected.', 'error');
    }
  };

  const handlePurgeProvider = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this wholesale provider connection?')) return;
    try {
      const resp = await fetch(`/api/admin/providers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        triggerFeedback('Wholesale Provider node deleted');
        fetchAllData();
      }
    } catch {
      triggerFeedback('Deletion failed', 'error');
    }
  };

  // Recharts graphs processing
  const getDailyMetricsData = () => {
    // Generate daily revenues and orders
    const days: Record<string, { date: string; revenue: number; volume: number }> = {};
    orders.forEach(o => {
      const d = o.createdAt ? o.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
      if (!days[d]) {
        days[d] = { date: d.substring(5), revenue: 0, volume: 0 };
      }
      days[d].revenue += o.charge;
      days[d].volume += 1;
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getPopularityData = () => {
    const cats: Record<string, number> = {};
    orders.forEach(o => {
      const cls = o.category || 'Other API Category';
      cats[cls] = (cats[cls] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const filterRow = <T extends Record<string, any>>(list: T[], searchFields: (keyof T)[]): T[] => {
    return list.filter(item => {
      const matchesSearch = searchFields.some(field => 
        String(item[field] || '').toLowerCase().includes(search.toLowerCase())
      );
      return matchesSearch;
    });
  };

  const paginate = <T,>(list: T[]): { paginated: T[]; totalPages: number } => {
    const totalPages = Math.ceil(list.length / itemsPerPage);
    const paginated = list.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    return { paginated, totalPages };
  };

  const activeTicketInfo = tickets.find(t => t.id === activeTicketId);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950/20 text-gray-800 dark:text-zinc-200 p-3 sm:p-6 font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {feedback.msg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 p-4 rounded-xl shadow-xl backdrop-blur-md border ${
              feedback.type === 'error' 
                ? 'bg-red-50/90 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/30' 
                : 'bg-white/90 dark:bg-zinc-900/90 border-emerald-200/50 dark:border-emerald-800/30'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            <span className="text-xs font-semibold">{feedback.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Title bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-755 dark:from-white dark:via-zinc-250 dark:to-indigo-400 bg-clip-text text-transparent">
            MK Administrator Panel
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Real-time control matrix, pricing categories, automated API providers, order ledger monitoring, and support desk
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:self-center">
          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200/50 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 px-4 py-2 text-xs font-medium cursor-pointer transition-all shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Node</span>
          </button>
        </div>
      </div>

      {/* Modern Dashboard Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sleek Navigation Rail */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none border-b lg:border-b-0 lg:border-r border-gray-205 dark:border-zinc-800">
          {[
            { id: 'overview', icon: BarChart3, label: 'Stats Overview' },
            { id: 'users', icon: Users, label: 'Client Accounts' },
            { id: 'services', icon: Layers, label: 'Services Catalog' },
            { id: 'categories', icon: ListPlus, label: 'Categories' },
            { id: 'providers', icon: Globe, label: 'API Providers' },
            { id: 'orders', icon: ShoppingBag, label: 'Fulfillment Orders' },
            { id: 'payments', icon: DollarSign, label: 'payments & ledger' },
            { id: 'tickets', icon: TicketIcon, label: 'Support helpdesk' },
            { id: 'analytics', icon: ArrowUpDown, label: 'Reports & Popularity' },
            { id: 'audit', icon: AuditIcon, label: 'Audit Logledger' },
            { id: 'settings', icon: Settings, label: 'Site settings' }
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id as AdminTab); setPage(1); setSearch(''); }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active 
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100/50 dark:hover:bg-zinc-900/30'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab contents window */}
        <div className="lg:col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass p-5 rounded-3xl border border-gray-200/50 dark:border-zinc-900 bg-white/70 dark:bg-zinc-900/30 backdrop-blur-xl shadow-lg relative min-h-[450px]"
            >
              
              {/* STATUS BAR WITH SEARCH & EXPORT */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Tab Context: {tab}
                  </h3>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {['users', 'services', 'orders', 'payments', 'audit'].includes(tab) && (
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search current records..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full sm:w-64 pl-9 pr-4 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/50 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {['users', 'orders', 'payments'].includes(tab) && (
                    <button 
                      onClick={() => handleExportCSV(tab as 'users' | 'orders' | 'transactions')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-250 dark:border-zinc-800 text-xs font-semibold cursor-pointer text-gray-700 bg-white hover:bg-gray-50/80 dark:bg-zinc-900/20 dark:text-zinc-300"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>CSV Export</span>
                    </button>
                  )}
                </div>
              </div>

              {/* OVERVIEW MODULE */}
              {tab === 'overview' && stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { icon: Users, label: 'Client Base', value: stats.totalUsers, color: 'text-indigo-550', desc: `${stats.activeUsers} active accounts` },
                      { icon: DollarSign, label: 'Net Profit (Est)', value: `$${stats.totalProfit.toFixed(2)}`, color: 'text-emerald-550', desc: 'Calculated 35% margin' },
                      { icon: ShoppingBag, label: 'Total Orders', value: stats.totalOrders, color: 'text-amber-550', desc: `${stats.pendingOrders} in execution` },
                      { icon: TicketIcon, label: 'Open Tickets', value: stats.openTickets, color: 'text-rose-550', desc: 'Requires developer review' },
                      { icon: Layers, label: 'Wholesale Catalog', value: services.length, color: 'text-purple-550', desc: `across ${categories.length} segments` },
                      { icon: Globe, label: 'Upstream Resellers', value: providers.length, color: 'text-sky-550', desc: `monitoring live integrations` }
                    ].map((card, i) => {
                      const CardIcon = card.icon;
                      return (
                        <div key={i} className="p-4 bg-gray-50/50 dark:bg-zinc-950/20 rounded-2xl border border-gray-200/30 dark:border-zinc-850 shadow-sm hover:translate-y-[-2px] transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">{card.label}</span>
                            <CardIcon className={`h-4.5 w-4.5 ${card.color}`} />
                          </div>
                          <div className="mt-2 text-xl font-display font-bold">{card.value}</div>
                          <div className="text-[10px] text-gray-400/90 mt-1 font-mono">{card.desc}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Analytics trend preview inside stats */}
                  <div className="p-4 bg-gray-50/50 dark:bg-zinc-950/10 rounded-2xl border border-gray-250/30 dark:border-zinc-850">
                    <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider font-mono">Gross Revenue Timeline (recharts Area)</h4>
                    <div className="h-64 sm:h-72 w-full">
                      {getDailyMetricsData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getDailyMetricsData()}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                            <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#18181B', borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400">Not enough order transactions on record. Add manual mock orders.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENTS MODULE */}
              {tab === 'users' && (
                <div className="space-y-6">
                  
                  {/* DataTable Grid */}
                  <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-zinc-800 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="pb-3 text-left">Consumer Profile</th>
                          <th className="pb-3 text-left">Contact Info</th>
                          <th className="pb-3 text-left">Privileges</th>
                          <th className="pb-3 text-left">Wallet Balance</th>
                          <th className="pb-3 text-left">Operational state</th>
                          <th className="pb-3 text-center">Admin Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/50 dark:divide-zinc-800/40">
                        {paginate(filterRow<User>(users, ['username', 'email', 'status', 'role'])).paginated.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="py-3 items-start">
                              <div className="font-semibold text-gray-900 dark:text-zinc-100">{u.username}</div>
                              <div className="text-[10px] text-gray-400">UID: {u.id}</div>
                            </td>
                            <td className="py-3">{u.email}</td>
                            <td className="py-3">
                              {currentUser.role === 'superadmin' ? (
                                <select
                                  value={u.role}
                                  onChange={async (e) => {
                                    const newRole = e.target.value as any;
                                    try {
                                      const resp = await fetch(`/api/admin/users/${u.id}/role`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ role: newRole })
                                      });
                                      if (resp.ok) {
                                        triggerFeedback(`Updated ${u.username} to ${newRole} privileges!`, 'success');
                                        fetchAllData();
                                      } else {
                                        const resErr = await resp.json();
                                        triggerFeedback(resErr.error || 'Failed to update privilege level', 'error');
                                      }
                                    } catch (err: any) {
                                      triggerFeedback(err.message, 'error');
                                    }
                                  }}
                                  className="bg-zinc-950 text-zinc-100 border border-zinc-900 text-[10px] font-bold py-0.5 px-2 rounded-lg cursor-pointer outline-none uppercase"
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                  <option value="ACTIVE / ADMIN PLAN">Active / Admin Plan</option>
                                  <option value="superadmin">Superadmin</option>
                                </select>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${u.role === 'superadmin' ? 'bg-[#ef4444]/15 text-[#ef4444]' : u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15' : 'bg-gray-100 text-gray-650 dark:bg-zinc-800'}`}>
                                  {u.role}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-sm font-bold font-mono text-emerald-600">${u.balance.toFixed(2)}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600'}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => { setSelectedUserId(u.id); setBalanceInput(u.balance.toString()); }}
                                  className="rounded-lg border border-gray-200/50 dark:border-zinc-800/80 px-2 py-1 hover:bg-gray-100 hover:text-indigo-650 cursor-pointer text-[10px] font-semibold"
                                >
                                  Modify balance
                                </button>
                                {u.role !== 'admin' && u.role !== 'superadmin' && u.role !== 'ACTIVE / ADMIN PLAN' && (
                                  <button 
                                    onClick={() => handleToggleSuspension(u.id, u.status)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                      u.status === 'active' ? 'bg-red-50 text-red-605 dark:bg-red-500/10' : 'bg-emerald-50 text-emerald-605 dark:bg-emerald-500/10'
                                    }`}
                                  >
                                    {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Modify balance Overlay popup */}
                  {selectedUserId && (
                    <div className="p-4 bg-indigo-50/10 rounded-2xl border border-indigo-200/30 mt-4 flex items-center justify-between text-xs transition-all">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-600">Adjust consumer capital manually:</span>
                        <input 
                          type="number"
                          placeholder="New Balance"
                          value={balanceInput}
                          onChange={(e) => setBalanceInput(e.target.value)}
                          className="bg-white dark:bg-zinc-950/80 border p-1 rounded-xl outline-none w-28 text-center font-mono font-bold"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleModifyBalance(selectedUserId)} className="bg-emerald-650 text-white rounded-xl px-3 py-1 font-semibold cursor-pointer">Save updates</button>
                        <button onClick={() => setSelectedUserId(null)} className="text-gray-400 hover:underline">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Pagination Control */}
                  {renderPagination(filterRow<User>(users, ['username', 'email']))}
                </div>
              )}

              {/* SERVICES CATALOG */}
              {tab === 'services' && (
                <div className="space-y-6">
                  
                  {/* Quick Sync & Sync Details Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-indigo-50/10 dark:bg-zinc-950/45 rounded-2xl border border-indigo-100/30 dark:border-zinc-800 gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-850 dark:text-zinc-150 flex items-center gap-2">
                        <span>Services Reseller API Synchronization</span>
                        {settings?.autoSyncServices && (
                          <span className="bg-emerald-50 text-emerald-750 text-[9px] font-bold px-2 py-0.5 rounded-full dark:bg-emerald-500/15 uppercase tracking-wide">
                            Auto Sync Active (6h)
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Connect with provider API automatically. Sync all services, add new packages, update existing rates, or disable missing items dynamically.
                        {settings?.lastSyncTime && (
                          <span className="block text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono text-[10px]">
                            Last synced: {new Date(settings.lastSyncTime).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        disabled={syncingServices}
                        onClick={() => handleSyncServices()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {syncingServices ? 'Syncing...' : 'Sync All Services'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Create service form collapsing */}
                  <div className="p-4 bg-gray-50/50 dark:bg-zinc-950/20 rounded-2xl border border-gray-200/50 dark:border-zinc-850">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add SMM wholesale Service node</h4>
                    <form onSubmit={handleCreateSvc} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Service category</label>
                        <select 
                          value={svcForm.category}
                          onChange={(e) => setSvcForm({...svcForm, category: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        >
                          <option value="">-- Choose Category --</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] text-gray-400 block mb-1">Service name</label>
                        <input 
                          type="text"
                          required
                          placeholder="Instagram Followers [High Quality/Active/Speed]"
                          value={svcForm.name}
                          onChange={(e) => setSvcForm({...svcForm, name: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Price per 1000 items ($)</label>
                        <input 
                          type="number"
                          step="0.01"
                          required
                          placeholder="1.25"
                          value={svcForm.rate}
                          onChange={(e) => setSvcForm({...svcForm, rate: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] text-gray-400 block mb-1">Service description</label>
                        <input 
                          type="text"
                          placeholder="Refill policy, execution speeds, constraints..."
                          value={svcForm.description}
                          onChange={(e) => setSvcForm({...svcForm, description: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-bold translate-y-px cursor-pointer">
                          Publish Service Link
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Service list table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-zinc-800 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="pb-3 text-left">Service ID & categorisation</th>
                          <th className="pb-3 text-left">Public Service Label</th>
                          <th className="pb-3 text-left">Wholesale cost/1K</th>
                          <th className="pb-3 text-left">Min/Max order threshold</th>
                          <th className="pb-3 text-left">Features</th>
                          <th className="pb-3 text-center">Catalog controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/50 dark:divide-zinc-800/40">
                        {paginate(filterRow<Service>(services, ['name', 'category', 'description'])).paginated.map(s => (
                          <tr key={s.id} className={`hover:bg-gray-50/20 transition-colors ${!s.active ? 'opacity-65 bg-red-500/[0.01]' : ''}`}>
                            <td className="py-3">
                              <span className="font-mono text-[9px] text-indigo-550 dark:text-indigo-400 block font-bold uppercase">{s.category}</span>
                              <span className="text-[10px] text-gray-400 font-mono">ID: {s.id} {s.originalServiceId && <span className="text-gray-400 text-[9px]">({s.originalServiceId})</span>}</span>
                            </td>
                            <td className="py-3 max-w-sm">
                              <div className="font-semibold text-gray-900 dark:text-zinc-100">{s.name}</div>
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{s.description}</p>
                            </td>
                            <td className="py-3 font-mono font-bold text-emerald-600">${s.rate.toFixed(4)}</td>
                            <td className="py-3 font-mono text-gray-400">{s.min} - {s.max.toLocaleString()}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {s.refill ? (
                                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    Refill
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    No Refill
                                  </span>
                                )}
                                {s.cancel ? (
                                  <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    Cancel
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    No Cancel
                                  </span>
                                )}
                                {!s.active ? (
                                  <span className="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    Disabled
                                  </span>
                                ) : (
                                  <span className="bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    Active
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => handlePurgeService(s.id)}
                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg cursor-pointer transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {renderPagination(filterRow<Service>(services, ['name', 'category']))}
                </div>
              )}

              {/* CATEGORIES MANAGEMENT */}
              {tab === 'categories' && (
                <div className="space-y-6 col-span-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Category Creation Card */}
                    <div className="p-4 bg-gray-50/50 dark:bg-zinc-950/20 rounded-2xl border border-gray-250/30 flex flex-col gap-4">
                      <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Spawn SMM Category</h4>
                      <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-gray-400 mb-1">Category name</label>
                          <input 
                            type="text"
                            required
                            placeholder="Instagram - Followers"
                            value={catForm.name}
                            onChange={(e) => setCatForm({...catForm, name: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Visual icon label</label>
                          <select 
                            value={catForm.icon}
                            onChange={(e) => setCatForm({...catForm, icon: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                          >
                            <option value="Instagram">Instagram (Heart)</option>
                            <option value="Youtube">Youtube (Tv)</option>
                            <option value="Tv">TikTok (Tv)</option>
                            <option value="Twitter">Twitter (Twitter)</option>
                            <option value="Clock">Clock (Watch Time)</option>
                            <option value="Layers">Layers (Default)</option>
                          </select>
                        </div>
                        <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold py-2.5 rounded-xl cursor-pointer">
                          Add category tag
                        </button>
                      </form>
                    </div>

                    {/* Category listing */}
                    <div className="md:col-span-2 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {categories.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50/50 dark:bg-zinc-950/15 border border-gray-200/50 dark:border-zinc-850">
                          <div>
                            <span className="text-[10px] text-gray-400 font-mono">CID: {c.id}</span>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{c.name}</h4>
                            <span className="text-[10px] text-indigo-550 dark:text-indigo-400 font-mono">Design layout icon: {c.icon}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.active ? 'Active' : 'Draft'}
                            </span>
                            <button 
                              onClick={() => handlePurgeCategory(c.id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}

              {/* SMM API PROVIDERS */}
              {tab === 'providers' && (
                <div className="space-y-6">
                  
                  {/* Create Provider Card */}
                  <div className="p-4 bg-gray-50/50 dark:bg-zinc-950/20 rounded-2xl border border-gray-250/30">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Integrate Reseller bulk API</h4>
                    <form onSubmit={handleCreateProvider} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Provider name</label>
                        <input 
                          type="text"
                          required
                          placeholder="JAP SMM bulk v2"
                          value={provForm.name}
                          onChange={(e) => setProvForm({...provForm, name: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Upstream URL</label>
                        <input 
                          type="url"
                          required
                          placeholder="https://justanotherpanel.com/api/v2"
                          value={provForm.url}
                          onChange={(e) => setProvForm({...provForm, url: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">API Authorization key</label>
                        <input 
                          type="text"
                          required
                          placeholder="jap_sec_xxx..."
                          value={provForm.apiKey}
                          onChange={(e) => setProvForm({...provForm, apiKey: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-400 block">Funds balance</label>
                        <input 
                          type="number"
                          placeholder="0.00"
                          value={provForm.balance}
                          onChange={(e) => setProvForm({...provForm, balance: e.target.value})}
                          className="w-24 bg-white dark:bg-zinc-950 border p-1 rounded-xl text-center"
                        />
                      </div>
                      <div className="sm:col-span-2 text-right">
                        <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl font-bold cursor-pointer">
                          Connect Bulk Node
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Providers display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {providers.map(p => (
                      <div key={p.id} className="p-4 bg-white dark:bg-zinc-950/20 border rounded-2xl space-y-3 dark:border-zinc-850">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-505 dark:text-indigo-400 font-mono">ID: {p.id}</span>
                            <h4 className="text-sm font-semibold">{p.name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.active ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-405 truncate">{p.url}</div>
                        <div className="flex justify-between items-center text-xs border-t pt-3 border-gray-100 dark:border-zinc-800">
                          <span className="font-semibold">Api Balance: <span className="font-mono text-emerald-600 font-bold">${p.balance.toFixed(2)}</span></span>
                          <button 
                            onClick={() => handlePurgeProvider(p.id)}
                            className="bg-red-50 text-red-505 p-1.5 rounded-xl text-[10px] cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* ORDERS MANAGEMENT */}
              {tab === 'orders' && (
                <div className="space-y-6">
                  
                  {/* Ledger Display */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-zinc-800 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="pb-3 text-left">Order ID</th>
                          <th className="pb-3 text-left">Service Item</th>
                          <th className="pb-3 text-left">Quantity / Charge</th>
                          <th className="pb-3 text-left">Fulfillment Status</th>
                          <th className="pb-3 text-center">Fast administrative Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/50 dark:divide-zinc-800/40">
                        {paginate(filterRow<Order>(orders, ['id', 'userId', 'link', 'status', 'serviceName'])).paginated.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50/20 transition-colors">
                            <td className="py-3">
                              <span className="font-mono font-bold block">{o.id}</span>
                              <span className="text-[9px] text-gray-400 font-mono">UID: {o.userId}</span>
                            </td>
                            <td className="py-3 max-w-xs">
                              <span className="text-[10px] text-indigo-505 dark:text-indigo-400 block uppercase font-bold">{o.category || 'Other platform'}</span>
                              <div className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{o.serviceName}</div>
                              <a href={o.link} target="_blank" rel="noreferrer" className="text-[9px] underline text-gray-400 truncate block">{o.link}</a>
                            </td>
                            <td className="py-3">
                              <div className="font-mono font-semibold">{o.quantity.toLocaleString()} items</div>
                              <div className="font-mono text-emerald-600 font-bold">${o.charge.toFixed(3)}</div>
                            </td>
                            <td className="py-3 uppercase text-[9px] font-bold">
                              <span className={`px-2 py-0.5 rounded-full ${
                                o.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10' :
                                o.status === 'pending' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10' :
                                o.status === 'processing' ? 'bg-yellow-50 text-yellow-750 dark:bg-yellow-500/10' :
                                o.status === 'in_progress' ? 'bg-purple-50 text-purple-705' :
                                'bg-red-50 text-red-650'
                              }`}>
                                {o.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2 justify-center">
                                <select 
                                  value={o.status}
                                  onChange={(e) => handleQuicksetOrderStatus(o.id, e.target.value)}
                                  className="bg-white dark:bg-zinc-950 border px-1.5 py-1 text-[10px] rounded-lg focus:outline-none"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="canceled">Canceled</option>
                                </select>
                                <button 
                                  onClick={() => handleOrderRefillAPI(o.id)}
                                  className="px-1.5 py-1 bg-gray-50 border rounded-lg text-[9px] font-semibold cursor-pointer"
                                  title="Trigger refill"
                                >
                                  Refill
                                </button>
                                {o.status !== 'canceled' && o.status !== 'completed' && (
                                  <button 
                                    onClick={() => handleOrderCancelAPI(o.id)}
                                    className="px-1.5 py-1 bg-red-50 text-red-505 rounded-lg text-[9px] font-bold cursor-pointer hover:bg-red-100"
                                  >
                                    Refund
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {renderPagination(filterRow<Order>(orders, ['id', 'userId', 'link', 'status', 'serviceName']))}
                </div>
              )}

              {/* PAYMENTS & MONEY LEDGER */}
              {tab === 'payments' && (() => {
                const filteredTxs = transactions.filter(t => {
                  const matchesStatus = txStatusFilter === 'all' || t.status === txStatusFilter;
                  const matchesType = txTypeFilter === 'all' || (txTypeFilter === 'deposit' ? (t.type === 'deposit' || !t.type) : t.type === 'withdrawal');
                  return matchesStatus && matchesType;
                });
                const searchAndFilteredTxs = filterRow<Transaction>(filteredTxs, ['id', 'userId', 'method', 'status', 'username']);

                return (
                  <div className="space-y-6">
                    
                    {/* Direct transaction manual injector form */}
                    <div className="p-4 bg-gray-50/50 dark:bg-zinc-950/20 rounded-2xl border border-gray-200/50 dark:border-zinc-850 text-xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Load manually client funds balance ledger</h4>
                      <form onSubmit={handleManualPaymentInject} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-gray-400 mb-1">Consumer Profile Username or UID</label>
                          <input 
                            type="text"
                            required
                            placeholder="testuser"
                            value={fundsForm.username}
                            onChange={(e) => setFundsForm({...fundsForm, username: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Decimal Ledger Capital ($)</label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="50.00"
                            value={fundsForm.amount}
                            onChange={(e) => setFundsForm({...fundsForm, amount: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Funding source channel</label>
                          <select 
                            value={fundsForm.method}
                            onChange={(e) => setFundsForm({...fundsForm, method: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl"
                          >
                            <option value="Stripe">Stripe Gateway (Automatic)</option>
                            <option value="PayPal">PayPal (Automatic)</option>
                            <option value="Binance Pay">Binance Pay (Automatic)</option>
                            <option value="Easypaisa">Easypaisa (Manual approval)</option>
                            <option value="JazzCash">JazzCash (Manual approval)</option>
                            <option value="CorporateAdjustment">Adjustment & Bonus</option>
                          </select>
                        </div>
                        <div>
                          <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold py-2.5 rounded-xl cursor-pointer">
                            Inject Payment Ledger
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Filter and stats controls for transactions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-55/10 p-3 rounded-2xl border border-gray-100 dark:border-zinc-850">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">Filters:</span>
                        <select 
                          value={txTypeFilter} 
                          onChange={(e) => { setTxTypeFilter(e.target.value as any); setPage(1); }}
                          className="text-xs bg-white dark:bg-zinc-950 border px-2 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"
                        >
                          <option value="all">All Types</option>
                          <option value="deposit">Deposits</option>
                          <option value="withdrawal">Withdrawals</option>
                        </select>
                        <select 
                          value={txStatusFilter} 
                          onChange={(e) => { setTxStatusFilter(e.target.value as any); setPage(1); }}
                          className="text-xs bg-white dark:bg-zinc-950 border px-2 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                      <div className="text-xs text-gray-450">
                        Showing <strong className="text-gray-900 dark:text-white">{filteredTxs.length}</strong> transactions
                      </div>
                    </div>

                    {/* Transaction list ledger */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-150 dark:border-zinc-800 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="pb-3 text-left">TX ID</th>
                            <th className="pb-3 text-left">Client Info</th>
                            <th className="pb-3 text-left">Transaction Type</th>
                            <th className="pb-3 text-left">Funding Gateway</th>
                            <th className="pb-3 text-left">Amount</th>
                            <th className="pb-3 text-left">Reference / Receipt Info</th>
                            <th className="pb-3 text-left">Status</th>
                            <th className="pb-3 text-center">Fulfill Action / Admin Notes</th>
                            <th className="pb-3 text-right">Fulfillment Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50 dark:divide-zinc-800/40">
                          {paginate(searchAndFilteredTxs).paginated.map(t => {
                            const isDeposit = !t.type || t.type === 'deposit';
                            return (
                              <tr key={t.id} className="hover:bg-gray-50/20">
                                <td className="py-3 font-mono font-bold uppercase">{t.id}</td>
                                <td className="py-3">
                                  <span className="font-semibold block">{t.username || 'Client Consumer'}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">UID: {t.userId}</span>
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isDeposit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450' : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-450'
                                  }`}>
                                    {isDeposit ? 'DEPOSIT' : 'WITHDRAWAL'}
                                  </span>
                                </td>
                                <td className="py-3 font-semibold">{t.method}</td>
                                <td className="py-3 font-mono font-bold">
                                  <span className={isDeposit ? 'text-emerald-600' : 'text-red-500'}>
                                    {isDeposit ? '+' : '-'}${t.amount.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-3 font-mono text-gray-500 max-w-[170px]" title={t.senderDetails}>
                                  <div className="font-semibold text-gray-700 dark:text-zinc-300 break-all">{t.senderDetails || 'N/A'}</div>
                                  {t.screenshotUrl && (
                                    <div className="mt-1">
                                      <a 
                                        href={t.screenshotUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-extrabold uppercase text-[9px] border border-blue-200/50 dark:border-blue-900/30 hover:underline transition-all"
                                      >
                                        <Eye className="h-3 w-3" /> View Screenshot
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 text-[9px] uppercase font-bold">
                                  <span className={`px-2 py-0.5 rounded-full ${
                                    t.status === 'completed' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' 
                                      : t.status === 'pending' 
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30' 
                                      : 'bg-red-55/10 text-red-700 dark:bg-red-950/30'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  {t.status === 'pending' ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <input 
                                        type="text"
                                        placeholder="Reason / notes..."
                                        value={adminNotesInput[t.id] || ''}
                                        onChange={(e) => setAdminNotesInput({...adminNotesInput, [t.id]: e.target.value})}
                                        className="text-[10px] border px-1.5 py-1 rounded bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-200 w-24"
                                      />
                                      <button 
                                        onClick={() => handleProcessTransaction(t.id, 'completed')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px]"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => handleProcessTransaction(t.id, 'failed')}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-[10px]"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-medium text-gray-400 italic">
                                      {t.adminNotes || 'No notes left'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-gray-450 font-mono text-[10px] text-right">
                                  {t.createdAt ? t.createdAt.substring(0, 16).replace('T', ' ') : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {renderPagination(searchAndFilteredTxs)}
                  </div>
                );
              })()}

              {/* SUPPORT SYSTEM DESK */}
              {tab === 'tickets' && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Support Stream list threads */}
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tickets Queue</h4>
                      {tickets.map(t => {
                        const active = activeTicketId === t.id;
                        return (
                          <div 
                            key={t.id}
                            onClick={() => setActiveTicketId(t.id)}
                            className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                              active 
                                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900/35' 
                                : 'border-gray-100 hover:border-gray-200 dark:border-zinc-850 bg-gray-55/20'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs text-gray-900 dark:text-zinc-100 line-clamp-1">{t.subject}</span>
                              <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-full ${
                                t.status === 'open' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {t.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
                              <span>👤 {t.username || 'Client'}</span>
                              <span>{t.replies.length} responses</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat desk container */}
                    <div className="lg:col-span-2">
                      {activeTicketId && activeTicketInfo ? (
                        <div className="p-4 bg-white dark:bg-zinc-950/20 border rounded-3xl dark:border-zinc-850 flex flex-col min-h-[350px] justify-between">
                          
                          <div>
                            <div className="flex justify-between items-start border-b pb-3 mb-4">
                              <div>
                                <h4 className="text-sm font-semibold">{activeTicketInfo.subject}</h4>
                                <span className="text-[10px] text-gray-400">Owner User: {activeTicketInfo.username} | Status: {activeTicketInfo.status}</span>
                              </div>
                              <button 
                                onClick={() => handleCloseTicketId(activeTicketInfo.id)}
                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 px-3 py-1 font-semibold text-[10px] rounded-xl cursor-pointer"
                              >
                                Resolve Close Thread
                              </button>
                            </div>

                            <div className="space-y-4 max-h-[220px] overflow-y-auto mb-4 pr-1">
                              {/* Initial thread comment */}
                              <div className="p-3 bg-gray-50/50 dark:bg-zinc-900/20 rounded-xl max-w-[85%] text-left">
                                <span className="text-[9px] block text-gray-450 font-bold mb-1 font-mono">Consumer Owner:</span>
                                <p className="text-xs text-gray-800 dark:text-zinc-300">{activeTicketInfo.message}</p>
                              </div>

                              {/* replies */}
                              {activeTicketInfo.replies.map(r => (
                                <div 
                                  key={r.id} 
                                  className={`p-3 rounded-xl max-w-[85%] text-left ${
                                    r.role === 'admin' 
                                      ? 'bg-indigo-50/40 border border-indigo-100/50 ml-auto' 
                                      : 'bg-gray-55/40 mr-auto'
                                  }`}
                                >
                                  <span className="text-[9px] block text-gray-450 font-bold mb-1 font-mono">{r.username} ({r.role}):</span>
                                  <p className="text-xs text-gray-800 dark:text-zinc-300">{r.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Response form */}
                          {activeTicketInfo.status !== 'closed' ? (
                            <form onSubmit={handleTicketReplyAndCommit} className="flex gap-2">
                              <input 
                                type="text"
                                required
                                placeholder="Write professional administrator response..."
                                value={replyMsg}
                                onChange={(e) => setReplyMsg(e.target.value)}
                                className="flex-1 bg-white dark:bg-zinc-950 border px-3.5 py-2 rounded-xl text-xs outline-none"
                              />
                              <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                                Reply Dispatch
                              </button>
                            </form>
                          ) : (
                            <div className="text-center p-3 text-xs bg-red-50 text-red-650 rounded-xl">Conversational thread locked and archived. Closed task resolved.</div>
                          )}

                        </div>
                      ) : (
                        <div className="text-center py-16 text-xs text-gray-400 bg-gray-50/20 border border-dashed rounded-3xl dark:border-zinc-800">
                          Select customer helpdesk inquiry thread to load corresponding admin visualizer.
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* REPORTS & POPULARITY CHART */}
              {tab === 'analytics' && (
                <div className="space-y-6" id="advanced-analytics-system-container">
                  
                  {/* Reporting Interval Selector & Top KPIs */}
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-900 gap-4">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">Advanced Real-Time Business Intelligence</h3>
                      <p className="text-[10px] text-zinc-400">Continuous micro-audits across orders, services performance, and provider margins</p>
                    </div>
                    <div className="flex bg-[#121212] p-1 rounded-xl border border-zinc-850">
                      {(['daily', 'weekly', 'monthly'] as const).map((range) => (
                        <button
                          key={range}
                          onClick={() => setReportRange(range)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                            reportRange === range
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-zinc-450 hover:text-white'
                          }`}
                        >
                          {range} Reports
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Time Series Metric Chart */}
                  <div className="p-5 bg-gradient-to-b from-[#0e0e11] to-black rounded-2xl border border-zinc-900">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#71717a]">Financial Growth & Operating Profit</h4>
                        <p className="text-[10px] text-emerald-500 mt-0.5">35% average gross margins on all processed order packages</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10.5px] font-mono leading-none">
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3b82f6]"></span><span className="text-zinc-400">Revenue</span></div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10b981]"></span><span className="text-zinc-400">Profit Margin</span></div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#6366f1]"></span><span className="text-zinc-400">Orders Count</span></div>
                      </div>
                    </div>

                    <div className="h-72 w-full">
                      {analytics ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics[reportRange] || []}>
                            <defs>
                              <linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey={reportRange === 'daily' ? 'date' : reportRange === 'weekly' ? 'week' : 'month'} 
                              stroke="#52525b" 
                              fontSize={9} 
                              tickLine={false} 
                              tickFormatter={(v) => reportRange === 'daily' ? v.substring(5) : v}
                            />
                            <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #27272a', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                            <Area type="monotone" dataKey="revenue" name="Total Revenue ($)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colRev)" />
                            <Area type="monotone" dataKey="profit" name="Net Profit ($)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colProfit)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono animate-pulse">Running telemetry report aggregates...</div>
                      )}
                    </div>
                  </div>

                  {/* Secondary analytics rows (User growth, order status breakdowns) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* User Growth Column */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">User Growth Analytics</h4>
                        <p className="text-[9px] text-zinc-650 uppercase tracking-widest font-semibold">Daily profile registrations</p>
                      </div>
                      <div className="h-48 my-4">
                        {analytics ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.daily || []}>
                              <XAxis dataKey="date" stroke="#3f3f46" fontSize={8} tickFormatter={(v) => v.substring(8)} tickLine={false} />
                              <YAxis stroke="#3f3f46" fontSize={8} tickLine={false} />
                              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1f1f22', borderRadius: '8px', fontSize: '10px' }} />
                              <Bar dataKey="userGrowth" name="New Clients" fill="#6366f1" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">Loading data...</div>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium">
                        Total consumer pool: <span className="text-white font-mono font-bold">{users.length} registered nodes</span>
                      </div>
                    </div>

                    {/* Orders Status Distribution */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Fulfillment Distribution</h4>
                        <p className="text-[9px] text-zinc-650 uppercase tracking-widest font-semibold">Proportional order categories</p>
                      </div>
                      <div className="h-48 my-4 relative flex items-center justify-center">
                        {analytics ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.orderStatuses || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={3}
                                dataKey="count"
                                nameKey="status"
                              >
                                {(analytics.orderStatuses || []).map((entry: any, idx: number) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1f1f22', borderRadius: '8px', fontSize: '10px', color: '#fff' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">Loading distribution...</div>
                        )}
                        <div className="absolute font-mono text-center pointer-events-none">
                          <span className="text-lg font-black block text-indigo-500 leading-none">{orders.length}</span>
                          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold block mt-0.5">Orders</span>
                        </div>
                      </div>
                      {/* Interactive Legends indicator */}
                      <div className="grid grid-cols-3 gap-2 text-[9px] text-zinc-450 font-semibold uppercase font-mono">
                        {(analytics?.orderStatuses || []).map((st: any, idx: number) => (
                          <div key={st.status} className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full flex-none" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                            <span className="truncate">{st.status}: {st.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Summary KPIs */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Net Treasury Assets</h4>
                        <p className="text-[9px] text-zinc-650 uppercase tracking-widest font-semibold">Liquidity & pending deposits</p>
                      </div>
                      <div className="my-3 space-y-2.5 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-center text-xs border-b border-zinc-900 pb-1.5">
                          <span className="text-zinc-400">Completed Deposits:</span>
                          <span className="font-mono text-emerald-500 font-extrabold">${analytics?.financialSummary?.totalDeposits?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-zinc-900 pb-1.5">
                          <span className="text-zinc-400">Total Withdrawals:</span>
                          <span className="font-mono text-red-500 font-extrabold">${analytics?.financialSummary?.totalWithdrawals?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-zinc-900 pb-1.5">
                          <span className="text-zinc-400">Pending Ledger Funds:</span>
                          <span className="font-mono text-yellow-500 font-extrabold">${analytics?.financialSummary?.pendingDeposits?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Total User Capital Pool:</span>
                          <span className="font-mono text-blue-500 font-extrabold">${analytics?.financialSummary?.netLiquidity?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-550 border-t border-zinc-900 pt-2 flex items-center justify-between">
                        <span>Ledger Sync: active</span>
                        <span className="text-blue-500">● Live</span>
                      </div>
                    </div>

                  </div>

                  {/* Service Statistics performance catalog */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Best Selling SMM Packages */}
                    <div className="lg:col-span-8 p-5 bg-zinc-950 rounded-2xl border border-zinc-900">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#71717a] mb-4">Top 10 SMM Packages (Wholesale demand)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[9px] pb-2">
                              <th className="pb-2">SMM Package Info</th>
                              <th className="pb-2 text-right">Fulfillment Count</th>
                              <th className="pb-2 text-right">Units Sold</th>
                              <th className="pb-2 text-right">Gross Income</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {(analytics?.servicePerformance || []).map((s: any, idx: number) => (
                              <tr key={s.name || idx} className="hover:bg-zinc-900/20">
                                <td className="py-2.5 pr-2">
                                  <div className="font-bold text-zinc-100 truncate max-w-[280px] sm:max-w-md">{s.name}</div>
                                  <div className="text-[9px] text-zinc-500">{s.category}</div>
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-indigo-400">{s.orderCount} pkgs</td>
                                <td className="py-2.5 text-right font-mono text-zinc-300">{s.volume.toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono font-black text-emerald-500">${s.revenue.toFixed(2)}</td>
                              </tr>
                            ))}
                            {(!analytics?.servicePerformance || analytics.servicePerformance.length === 0) && (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-zinc-500">No sales transactions available to aggregate.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* API Provider Performance & Routing success */}
                    <div className="lg:col-span-4 p-5 bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#71717a] mb-1">Provider performance</h4>
                        <p className="text-[9px] text-[#52525b] uppercase tracking-widest font-semibold mb-4">Wholesale Routing & Completions</p>
                      </div>
                      <div className="space-y-4 flex-1 my-3 justify-center flex flex-col">
                        {(analytics?.providerPerformance || []).map((p: any) => (
                          <div key={p.name} className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-zinc-200">{p.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{p.successRate}% Success</span>
                            </div>
                            {/* Graphical completion percent bar */}
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.successRate}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                              <span>Orders: {p.orderCount}</span>
                              <span>Spent: ${p.totalSpend.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                        {(!analytics?.providerPerformance || analytics.providerPerformance.length === 0) && (
                          <div className="text-center py-10 text-zinc-650 text-xs">No active wholesale API providers connected.</div>
                        )}
                      </div>
                      <div className="text-[9.5px] text-zinc-500 border-t border-zinc-900 pt-3">
                        Total API Wholesale Spend: <span className="font-bold text-white font-mono">${(analytics?.providerPerformance || []).reduce((sum: number, p: any) => sum + p.totalSpend, 0).toFixed(2)} USD</span>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* AUDIT TIMELINE */}
              {tab === 'audit' && (
                <div className="space-y-6">
                  
                  <div className="relative border-l border-gray-200 dark:border-zinc-800 pl-4 space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {paginate(filterRow<AuditLog>(auditLogs, ['userId', 'username', 'action', 'details'])).paginated.map(log => (
                      <div key={log.id} className="relative py-1">
                        {/* Bullets point */}
                        <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-zinc-900 border-2 border-white dark:bg-white dark:border-zinc-950" />
                        
                        <div className="bg-gray-50/50 dark:bg-zinc-900/10 p-3 rounded-2xl border border-gray-200/50 dark:border-zinc-800 text-left text-xs">
                          <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                            <span className="font-mono tracking-wide font-bold uppercase text-indigo-550 dark:text-indigo-400">Event: {log.action}</span>
                            <span className="font-mono">{log.createdAt ? log.createdAt.replace('T', ' ').substring(0, 16) : 'N/A'}</span>
                          </div>
                          <p className="text-gray-800 dark:text-zinc-250 font-semibold">{log.details}</p>
                          <div className="flex justify-between items-center text-[10px] mt-1 text-gray-405 font-mono">
                            <span>Operator: {log.username} (UID: {log.userId})</span>
                            <span>IP: {log.ipAddress || 'Internal Gateway'}</span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                  {renderPagination(filterRow<AuditLog>(auditLogs, ['username', 'action', 'details']))}
                </div>
              )}

              {/* CONFIG GLOBAL SETTINGS */}
              {tab === 'settings' && (
                <div className="max-w-xl mx-auto space-y-6">
                  
                  <form onSubmit={handleSaveSettings} className="space-y-4 text-left text-xs">
                    <div className="p-4 bg-gray-50/50 dark:bg-zinc-950/20 border rounded-2xl space-y-4 dark:border-zinc-850">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Core Variables Configuration</h4>
                      
                      <div>
                        <label className="block mb-1 font-semibold text-gray-500">Site Platform Label</label>
                        <input 
                          type="text"
                          required
                          value={settingsForm.panelName}
                          onChange={(e) => setSettingsForm({...settingsForm, panelName: e.target.value})}
                          className="w-full bg-white dark:bg-zinc-95 border px-3 py-2 rounded-xl"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block mb-1 font-semibold text-gray-500">Denomination (e.g. USD)</label>
                          <input 
                            type="text"
                            required
                            value={settingsForm.currency}
                            onChange={(e) => setSettingsForm({...settingsForm, currency: e.target.value})}
                            className="w-full bg-white dark:bg-zinc-95 border p-2 rounded-xl text-center"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-500">Min. Funding Deposit ($)</label>
                          <input 
                            type="number"
                            required
                            value={settingsForm.minDeposit}
                            onChange={(e) => setSettingsForm({...settingsForm, minDeposit: parseFloat(e.target.value)})}
                            className="w-full bg-white dark:bg-zinc-95 border p-2 rounded-xl text-center"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-500">Max. Deposit Limit ($)</label>
                          <input 
                            type="number"
                            required
                            value={settingsForm.maxDeposit}
                            onChange={(e) => setSettingsForm({...settingsForm, maxDeposit: parseFloat(e.target.value)})}
                            className="w-full bg-white dark:bg-zinc-95 border p-2 rounded-xl text-center"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-zinc-900/10 border border-gray-150">
                        <div>
                          <h4 className="font-semibold text-gray-800 dark:text-zinc-100 uppercase text-[10px]">Maintenance offline Mode</h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Locks consumer entry gates, permits administrator bypass connections</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={settingsForm.maintenanceMode}
                          onChange={(e) => setSettingsForm({...settingsForm, maintenanceMode: e.target.checked})}
                          className="h-5 w-5 rounded accent-zinc-905"
                        />
                      </div>

                      {/* Services Auto-Sync Toggles */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/10 dark:bg-zinc-950/10 border border-indigo-200/20">
                        <div>
                          <h4 className="font-semibold text-indigo-850 dark:text-indigo-400 uppercase text-[10px] flex items-center gap-1.5">
                            <span>Auto Sync Services Catalog</span>
                          </h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Query SMM Provider APIs and refresh catalog prices, min, and max. Disables missing services automatically.
                          </span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={settingsForm.autoSyncServices}
                          onChange={(e) => setSettingsForm({...settingsForm, autoSyncServices: e.target.checked})}
                          className="h-5 w-5 rounded accent-indigo-650"
                        />
                      </div>

                      {settingsForm.autoSyncServices && (
                        <div className="p-3.5 rounded-2xl bg-gray-50/40 dark:bg-zinc-900/10 border border-gray-150 text-left space-y-2">
                          <label className="block text-[10px] uppercase font-bold text-gray-450 tracking-wider">
                            Auto Synchronization Interval Cycle (Hours)
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number"
                              min="1"
                              max="168"
                              required
                              value={settingsForm.autoSyncIntervalHours}
                              onChange={(e) => setSettingsForm({...settingsForm, autoSyncIntervalHours: parseInt(e.target.value, 10) || 6})}
                              className="bg-white dark:bg-zinc-950 border px-3 py-1.5 rounded-xl w-24 font-mono font-bold text-center"
                            />
                            <span className="text-[11px] text-gray-400">
                              Hours. Defaults to 6 hours. High frequencies might hit API limits.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* SMM Markup and Pricing Options */}
                      <div className="p-4 bg-indigo-50/10 dark:bg-zinc-950/20 border border-indigo-200/20 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-550 dark:text-indigo-450 flex items-center gap-1.5">
                          <span>SMM Margin & Markup Controls</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-1 text-[10px] uppercase font-semibold text-gray-500">Percentage Markup (%)</label>
                            <input 
                              type="number"
                              min="0"
                              step="0.1"
                              required
                              value={settingsForm.markupPercent}
                              onChange={(e) => setSettingsForm({...settingsForm, markupPercent: parseFloat(e.target.value) || 0})}
                              className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl font-mono text-center"
                              placeholder="e.g. 30"
                            />
                            <span className="text-[9px] text-gray-400 mt-1 block">Incremental percentage relative to cost (e.g., 30 for 30% markup)</span>
                          </div>
                          <div>
                            <label className="block mb-1 text-[10px] uppercase font-semibold text-gray-500">Fixed Markup ($)</label>
                            <input 
                              type="number"
                              min="0"
                              step="0.0001"
                              required
                              value={settingsForm.markupFixed}
                              onChange={(e) => setSettingsForm({...settingsForm, markupFixed: parseFloat(e.target.value) || 0})}
                              className="w-full bg-white dark:bg-zinc-950 border px-3 py-2 rounded-xl font-mono text-center"
                              placeholder="e.g. 0.20"
                            />
                            <span className="text-[9px] text-gray-400 mt-1 block">Fixed dollar offset added to every single price (e.g., 0.20)</span>
                          </div>
                        </div>

                        {/* Interactive Profit Calculator */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/10 border border-gray-200 dark:border-zinc-800 mt-2 text-xs">
                          <span className="font-extrabold uppercase text-[9px] text-emerald-600 dark:text-emerald-400 block mb-1.5">Interactive Profit Simulator</span>
                          <div className="space-y-1.5 text-gray-500 dark:text-zinc-400 font-mono text-[11px]">
                            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/30 p-2 rounded-lg">
                              <span>Provider Cost Price (per 1K):</span>
                              <span className="font-bold text-gray-800 dark:text-zinc-200">$1.00</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/30 p-2 rounded-lg">
                              <span>Applied Pricing Formula:</span>
                              <span className="font-bold text-gray-800 dark:text-zinc-200">Cost × (1 + {(settingsForm.markupPercent || 0)}%) + ${(settingsForm.markupFixed || 0).toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-2 rounded-lg">
                              <span>Customer Retail Price (per 1K):</span>
                              <span className="font-bold">${(1.0 * (1 + (settingsForm.markupPercent || 0) / 100) + (settingsForm.markupFixed || 0)).toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-indigo-500/10 text-indigo-700 dark:text-indigo-450 p-2 rounded-lg mt-1 font-semibold">
                              <span>Direct Profit Earned (per 1K):</span>
                              <span className="font-bold">${((1.0 * (1 + (settingsForm.markupPercent || 0) / 100) + (settingsForm.markupFixed || 0)) - 1.0).toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <button 
                        type="submit"
                        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold px-6 py-3 rounded-xl cursor-pointer"
                      >
                        Keep Committed settings
                      </button>
                    </div>
                  </form>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );

  // Pagination Element Helper Component inline
  function renderPagination<T,>(listData: T[]) {
    const totalItems = listData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center text-xs mt-6 border-t border-gray-100 dark:border-zinc-800 pt-4 font-mono select-none">
        <span className="text-gray-400">records {Math.min(totalItems, (page - 1) * itemsPerPage + 1)} to {Math.min(totalItems, page * itemsPerPage)} of {totalItems}</span>
        
        <div className="flex gap-2.5">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1 px-3 border border-gray-200/50 hover:bg-gray-100 dark:border-zinc-800 rounded-xl disabled:opacity-30 cursor-pointer"
          >
            Previous
          </button>
          
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1 px-3 border border-gray-200/50 hover:bg-gray-100 dark:border-zinc-800 rounded-xl disabled:opacity-30 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    );
  }
}
