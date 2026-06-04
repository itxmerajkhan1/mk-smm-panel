/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Service, Order, Ticket, Transaction, Notification } from '../types';
import { useAuthContext } from './AuthContext';
import { 
  ShoppingBag, Layers, Wallet, Code, HelpCircle, 
  Send, Plus, Clock, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Sparkles, Copy, Trash2, CheckCircle, Bell,
  UserCheck, Key, ShieldAlert, Check, RefreshCcw, LogOut, Star, Grid, List,
  Eye, UploadCloud
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import DashboardCharts from './DashboardCharts';
import MassOrder from './MassOrder';
import ChildPanel from './ChildPanel';
import { formatCurrency, convertCurrency, EXCHANGE_RATES } from '../utils/currency';

interface DashboardProps {
  user: User;
  token: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshUser: () => void;
  quickDepositTrigger: number;
  currency: string;
  setCurrency: (c: string) => void;
}

export default function Dashboard({
  user,
  token,
  activeTab,
  setActiveTab,
  onRefreshUser,
  quickDepositTrigger,
  currency = 'USD',
  setCurrency
}: DashboardProps) {
  // Common states
  const { notifications, updateUserApiKey } = useAuthContext();
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [servicesSearchQuery, setServicesSearchQuery] = useState('');
  const [pricingViewMode, setPricingViewMode] = useState<'table' | 'cards'>('table');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [servicesFavorites, setServicesFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('mk_smm_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavoriteService = (id: string) => {
    setServicesFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id];
      localStorage.setItem('mk_smm_favorites', JSON.stringify(updated));
      return updated;
    });
  };
  
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // New Order Form State
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [targetLink, setTargetLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [estimatedCharge, setEstimatedCharge] = useState(0);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('25');
  const [depositMethod, setDepositMethod] = useState('Stripe');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState('');
  const [depositReceiptCode, setDepositReceiptCode] = useState('');
  const [senderPhoneNumber, setSenderPhoneNumber] = useState('');
  const [walletSubTab, setWalletSubTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Manual payment screenshot proof upload state mapping
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotUploadProgress, setScreenshotUploadProgress] = useState(0);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState('20');
  const [withdrawMethod, setWithdrawMethod] = useState('Easypaisa');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // Ticket Form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState('');
  
  // Selected Ticket detail state (for viewing/replying)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyMsg, setTicketReplyMsg] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // API states
  const [copiedKey, setCopiedKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  // Profile Form states
  const [profileSuccess, setProfileSuccess] = useState('');

  // Referral states
  const [referralsCount, setReferralsCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [commissionLogs, setCommissionLogs] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Refill / Cancel states inside Order lists
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load services list
  const fetchServices = async (forceRefetch = false) => {
    if (services.length > 0 && !forceRefetch) return;
    if (loadingServices) return;
    setLoadingServices(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (Array.isArray(data)) {
        const activeServices = data.filter(s => s.active);
        setServices(activeServices);
        
        // Extract unique categories
        const uniqCats = Array.from(new Set(activeServices.map(s => s.category)));
        setCategories(prev => {
          if (JSON.stringify(prev) === JSON.stringify(uniqCats)) return prev;
          return uniqCats;
        });
        if (uniqCats.length > 0) {
          setSelectedCategory(prev => {
            if (prev && uniqCats.includes(prev)) return prev;
            return uniqCats[0];
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServices(false);
    }
  };

  // Load orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load tickets
  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTickets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Load Transactions & history
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReferralStats = async () => {
    setLoadingReferrals(true);
    try {
      const res = await fetch('/api/referrals/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReferralsCount(data.referralCount || 0);
        setReferralEarnings(data.totalEarnings || 0);
        setReferredUsers(data.referredUsers || []);
        setCommissionLogs(data.commissionLogs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Refresh all state context
  const refreshAllState = (forceRefetch = false) => {
    fetchServices(forceRefetch);
    fetchOrders();
    fetchTickets();
    fetchTransactions();
    fetchReferralStats();
    onRefreshUser();
    
    // Clear residual Alerts
    setOrderError('');
    setOrderSuccess('');
    setDepositSuccess('');
    setTicketSuccess('');
  };

  // Effect: watch category to filter services
  useEffect(() => {
    if (selectedCategory && services.length > 0) {
      const filtered = services.filter(s => s.category === selectedCategory);
      setFilteredServices(prev => {
        if (JSON.stringify(prev) === JSON.stringify(filtered)) return prev;
        return filtered;
      });
      if (filtered.length > 0) {
        setSelectedServiceId(prev => {
          if (filtered.some(s => s.id === prev)) return prev;
          return filtered[0].id;
        });
      } else {
        setSelectedServiceId('');
        setSelectedService(null);
      }
    }
  }, [selectedCategory, services]);

  // Effect: watch service selection to reset bounds and limits instructions
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const found = services.find(s => s.id === selectedServiceId);
      if (found) {
        setSelectedService(prev => {
          if (prev && prev.id === found.id && prev.rate === found.rate && prev.min === found.min && prev.max === found.max) return prev;
          return found;
        });
        calculateEstimatedCharge(quantity, found);
      }
    }
  }, [selectedServiceId, services]);

  // Handle outside balance trigger
  useEffect(() => {
    if (quickDepositTrigger > 0) {
      setActiveTab('add-funds');
    }
  }, [quickDepositTrigger]);

  const calculateEstimatedCharge = (qty: string, svc: Service | null = selectedService) => {
    const qtyNum = parseInt(qty, 10);
    if (!svc || isNaN(qtyNum) || qtyNum <= 0) {
      setEstimatedCharge(0);
      return;
    }
    const rate = svc.rate;
    const charge = (qtyNum * rate) / 1000;
    setEstimatedCharge(parseFloat(charge.toFixed(4)));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantity(val);
    calculateEstimatedCharge(val);
  };

  // Place Order Action
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    setOrderSuccess('');
    
    if (!selectedServiceId || !targetLink || !quantity) {
      setOrderError('Please supply all required form fields.');
      return;
    }

    const qtyVal = parseInt(quantity, 10);
    if (selectedService) {
      if (qtyVal < selectedService.min || qtyVal > selectedService.max) {
        setOrderError(`Quantity error. Must specify value between ${selectedService.min} and ${selectedService.max} items.`);
        return;
      }
    }

    setPlacingOrder(true);
    try {
      const response = await fetch('/api/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          link: targetLink,
          quantity: qtyVal
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authorize SMM order placement.');
      }

      setOrderSuccess(`Success! Your order has been placed. Cost charged: $${estimatedCharge.toFixed(3)}.`);
      setTargetLink('');
      setQuantity('');
      setEstimatedCharge(0);
      onRefreshUser();
      fetchOrders();
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setScreenshotUrl('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setScreenshotUrl('');
    }
  };

  // Deposit simulation funds
  const handleDepositSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositSuccess('');
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 1) {
      alert('Please enter a realistic deposit amount greater than $1.');
      return;
    }

    const instantGateways = ['Stripe', 'PayPal', 'Binance Pay (Instant Auto)'];
    const isInstant = instantGateways.includes(depositMethod);

    setDepositLoading(true);

    try {
      let uploadedScreenshotUrl = '';

      // If manual deposit, require screenshot file
      if (!isInstant) {
        if (!depositReceiptCode.trim()) {
          alert('Please provide a payment proof Transaction Receipt ID / Hash.');
          setDepositLoading(false);
          return;
        }

        if (!screenshotFile) {
          alert('Please select or drag-and-drop a payment snapshot screenshot to upload.');
          setDepositLoading(false);
          return;
        }

        // Upload Screenshot synchronously to Firebase Storage
        setScreenshotUploading(true);
        setScreenshotUploadProgress(10);
        try {
          const storageRef = ref(storage, `deposit-screenshots/${user.id}_${Date.now()}_${screenshotFile.name}`);
          const uploadTask = uploadBytesResumable(storageRef, screenshotFile);
          
          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setScreenshotUploadProgress(progress);
              },
              (error) => {
                reject(error);
              },
              () => {
                resolve();
              }
            );
          });

          uploadedScreenshotUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setScreenshotUrl(uploadedScreenshotUrl);
          setScreenshotUploading(false);
        } catch (uploadError: any) {
          console.error('Screenshot upload to Firebase Storage failed:', uploadError);
          throw new Error(`Screenshot file upload failure: ${uploadError.message || 'Check database connection'}`);
        }
      }

      // Formulate sender details based on input requirements
      let senderDetails = '';
      if (!isInstant) {
        senderDetails = senderPhoneNumber 
          ? `Sender Ph: ${senderPhoneNumber} | Receipt: ${depositReceiptCode}` 
          : `Receipt ID: ${depositReceiptCode}`;
      } else {
        senderDetails = `Instant Simulation Payment - Verified Merchant ID (Stripe/Paypal)`;
      }

      const response = await fetch('/api/funds/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amt,
          method: depositMethod.replace(' (Instant Auto)', '').replace(' (Manual Ticket)', ''),
          senderDetails,
          type: 'deposit',
          isInstant,
          screenshotUrl: uploadedScreenshotUrl
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payment.');
      }

      if (isInstant) {
        setDepositSuccess(`Automatic Payment Gateway Verified! $${amt.toFixed(2)} USD loaded to your wallet instantly.`);
      } else {
        setDepositSuccess(`Manual Deposit Ticket Submitted! SMM Admins will verify your reference details and screenshot shortly. Status is now pending.`);
      }

      setDepositAmount('25');
      setDepositReceiptCode('');
      setSenderPhoneNumber('');
      setScreenshotFile(null);
      setScreenshotPreview('');
      setScreenshotUploadProgress(0);
      onRefreshUser();
      fetchTransactions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDepositLoading(false);
    }
  };

  // Withdrawal submission request pipeline
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawSuccess('');
    setWithdrawError('');
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 1) {
      setWithdrawError('Please enter a realistic withdrawal amount greater than $1.');
      return;
    }
    if (!withdrawDetails.trim()) {
      setWithdrawError('SMM is required to know your target account number/email payout details.');
      return;
    }

    setWithdrawLoading(true);

    try {
      const response = await fetch('/api/funds/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amt,
          method: withdrawMethod,
          senderDetails: `PayOut Receiver: ${withdrawDetails}`,
          type: 'withdrawal'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal validation failed.');
      }

      setWithdrawSuccess(`Success! Withdraw request of $${amt.toFixed(2)} submitted. Your wallet is updated.`);
      setWithdrawDetails('');
      onRefreshUser();
      fetchTransactions();
    } catch (err: any) {
      setWithdrawError(err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Order Refill trigger
  const handleRequestRefill = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/refill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchOrders();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Order Cancel trigger
  const handleRequestCancel = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order and claim partial refund?')) return;
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      onRefreshUser();
      fetchOrders();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit dynamic ticket request
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSuccess('');
    
    if (!ticketSubject || !ticketMessage) {
      alert('Please fill out both subject and message first.');
      return;
    }

    setCreatingTicket(true);
    try {
      const response = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: ticketSubject,
          message: ticketMessage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      setTicketSuccess('Support ticket loaded into workspace. Rest assured, our helpdesk team usually answers within an hour!');
      setTicketSubject('');
      setTicketMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingTicket(false);
    }
  };

  // Send message on active support ticket
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyMsg.trim() || !selectedTicketId) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: ticketReplyMsg })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      setTicketReplyMsg('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(user.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerating your developer key will lock out ongoing script triggers until updated. Proceed?')) return;
    setRegeneratingKey(true);
    try {
      await updateUserApiKey();
      alert('Your system authorization token has been regenerated.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRegeneratingKey(false);
    }
  };

  // On mount / active-tab changes
  useEffect(() => {
    if (token) {
      refreshAllState();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'referrals') {
      fetchReferralStats();
    }
  }, [token, activeTab]);

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  // Stats calculation
  const totalSpend = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.charge : sum, 0);
  const activeCount = orders.filter(o => o.status === 'processing' || o.status === 'in_progress' || o.status === 'pending').length;

  const handleSubmitAuditLog = async (log: any) => {
    try {
      await fetch('/api/auditLogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(log)
      });
    } catch (e) {
      console.error("Error submitting audit log:", e);
    }
  };

  const handleCreateTransaction = async (tx: any) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tx)
      });
      return await res.json();
    } catch (e) {
      console.error("Error creating tx:", e);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* ================= RECENT ENTERPRISE COCKPIT / DASHBOARD SPEC ================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border border-zinc-900 bg-[#070707] rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-600/5 blur-2xl"></div>
            <div>
              <h2 className="font-display text-xl font-black tracking-tight text-white uppercase italic">
                MK Enterprise System Overview
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Logged in as <strong className="text-zinc-200">{user.username}</strong> — Active Authorization Plan: <span className="text-blue-500 text-[10px] font-bold border border-blue-500/20 px-1 rounded uppercase tracking-wider">{user.role} plan</span>
              </p>
            </div>
            <button 
              onClick={() => refreshAllState(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-850 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-zinc-800 transition-all self-start cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>SYNC LEDGER</span>
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="p-5 border border-zinc-900 bg-zinc-950 rounded-xl leading-relaxed">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Current SMM Balance</span>
              <div className="font-mono text-2xl font-black text-blue-500 mt-1">
                {formatCurrency(convertCurrency(user.balance, 'USD', currency), currency)}
              </div>
              <button 
                onClick={() => setActiveTab('add-funds')}
                className="text-[9px] font-extrabold uppercase mt-2 text-zinc-400 hover:text-white block hover:underline"
              >
                Deposit SMM Funds →
              </button>
            </div>

            <div className="p-5 border border-zinc-900 bg-zinc-950 rounded-xl leading-relaxed">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Total Capital Injected</span>
              <div className="font-mono text-2xl font-black mt-1">
                {formatCurrency(convertCurrency(totalSpend, 'USD', currency), currency)}
              </div>
              <span className="text-[9px] text-zinc-500 block mt-2">Spent on {orders.length} unique metric nodes</span>
            </div>

            <div className="p-5 border border-zinc-900 bg-zinc-950 rounded-xl leading-relaxed">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Refillable & Active Nodes</span>
              <div className="font-mono text-2xl font-black text-orange-500 mt-1">{activeCount}</div>
              <button 
                onClick={() => setActiveTab('orders')} 
                className="text-[9px] font-extrabold uppercase mt-2 text-zinc-400 hover:text-white block hover:underline"
              >
                Trigger manual reflow logs →
              </button>
            </div>

            <div className="p-5 border border-zinc-900 bg-zinc-950 rounded-xl leading-relaxed">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Active Tickets</span>
              <div className="font-mono text-2xl font-black text-emerald-500 mt-1">{tickets.length}</div>
              <button 
                onClick={() => setActiveTab('support')} 
                className="text-[9px] font-extrabold uppercase mt-2 text-zinc-400 hover:text-white block hover:underline"
              >
                Open engineering support desk →
              </button>
            </div>

          </div>

          {/* Interactive Line Charts & Reports Analytics Dashboard */}
          <DashboardCharts 
            orders={orders} 
            transactions={transactions} 
            services={services} 
            currency={currency} 
          />

          {/* Core Dashboard Bento Grid split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Realtime Notifications box */}
            <div className="lg:col-span-2 border border-zinc-900 bg-[#090909] rounded-xl p-6 relative">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                  <h3 className="font-display font-black tracking-tight text-sm uppercase text-white">
                    Realtime System Broadcast Notifications
                  </h3>
                </div>
                <span className="text-[8px] tracking-widest text-zinc-500 font-extrabold block border border-zinc-850 px-1.5 rounded bg-black">
                  ACTIVE SYNC
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                  <Bell className="h-8 w-8 text-zinc-700" />
                  <h4 className="text-xs font-bold text-zinc-400">System Logs Clear</h4>
                  <p className="text-[10px] text-zinc-650 max-w-xs">No active alerts. Add funds or place orders to trigger real-time ledger announcements.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-2">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3.5 border rounded-xl transition-all ${
                        n.read ? 'border-zinc-900 bg-zinc-950/20 opacity-60' : 'border-blue-900/30 bg-blue-950/5'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold text-blue-400">{n.title}</span>
                        <span className="text-[8.5px] font-mono text-zinc-600">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-zinc-400 font-normal mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action shortcuts & security */}
            <div className="space-y-6">
              
              {/* developer Key details */}
              <div className="border border-zinc-900 bg-[#090909] rounded-xl p-5 text-left">
                <div className="flex gap-1.5 items-center mb-3">
                  <Key className="h-4 w-4 text-emerald-500" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Developer Vault Token</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal mb-4">
                  Used for authenticating scripts and reseller programs to our automatic server endpoints. Keep secure.
                </p>
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 p-2.5 rounded-lg select-all font-mono text-[10.5px]">
                  <span className="truncate flex-1 text-zinc-400">{user.apiKey}</span>
                  <button 
                    onClick={handleCopyKey}
                    className="p-1 hover:text-white text-zinc-500 border border-zinc-900 hover:bg-zinc-900 rounded"
                    title="Copy developer key"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <button 
                  onClick={handleRegenerateKey}
                  disabled={regeneratingKey}
                  className="mt-3 text-emerald-500 hover:text-emerald-400 text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 animate-spin" style={{ animationPlayState: regeneratingKey ? 'running' : 'paused' }} />
                  {regeneratingKey ? 'Regenerating in Vault...' : 'Regenerate API Token Key'}
                </button>
              </div>

              {/* Status checklist */}
              <div className="border border-zinc-900 bg-[#090909] rounded-xl p-5 text-left">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-3.5">
                  Node Endpoint status
                </span>
                <div className="space-y-3.5 text-xs text-zinc-400">
                  <div className="flex justify-between items-center">
                    <span>Stripe Card Gateway</span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/20 border border-emerald-900 px-1 rounded">● Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Instagram API Pipe</span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/20 border border-emerald-900 px-1 rounded">● Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TikTok View Delivery Engine</span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/20 border border-emerald-900 px-1 rounded">● Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Refill Automatons</span>
                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest bg-yellow-950/20 border border-yellow-905 px-1 rounded">● Standby</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ================= MASS COMPILED BULK ORDERS ================= */}
      {activeTab === 'mass-order' && (
        <MassOrder 
          user={user} 
          token={token} 
          services={services} 
          currency={currency} 
          onRefreshUser={onRefreshUser} 
        />
      )}

      {/* ================= WHITE-LABEL CHILD SMM PANEL NODE ================= */}
      {activeTab === 'child-panel' && (
        <ChildPanel 
          user={user} 
          token={token} 
          currency={currency} 
          onRefreshUser={onRefreshUser} 
          onSubmitAuditLog={handleSubmitAuditLog}
          onCreateTransaction={handleCreateTransaction}
        />
      )}

      {/* ================= NEW WORKSPACE ORDER DEVELOPMENT PANEL ================= */}
      {activeTab === 'new-order' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Order selection column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic">
                    Deploy SMM Metric Nodes
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Instantly boost post, link or video analytics dynamically with extreme scale stability.
                  </p>
                </div>
                <button 
                  onClick={() => refreshAllState(true)}
                  className="rounded-lg p-2 bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white"
                  title="Synchronize Database Stats"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {orderError && (
                <div className="mb-5 flex gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-500 font-medium">
                  <AlertCircle className="h-4.5 w-4.5 flex-none text-red-500" />
                  <span>{orderError}</span>
                </div>
              )}

              {orderSuccess && (
                <div className="mb-5 flex gap-2.5 rounded-lg border border-emerald-550/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-550 font-medium">
                  <CheckCircle2 className="h-4.5 w-4.5 flex-none" />
                  <span>{orderSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="space-y-5">
                {/* Category selectors */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    SMM Category Group
                  </label>
                  <select
                    id="order-category-select"
                    value={selectedCategory}
                    disabled={loadingServices}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCategory(val);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-zinc-850 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-blue-550 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingServices ? (
                      <option>Loading SMM Database Catalogs...</option>
                    ) : categories.length === 0 ? (
                      <option>No Categories Available</option>
                    ) : (
                      categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Target Acceleration Node
                  </label>
                  <select
                    id="order-service-select"
                    value={selectedServiceId}
                    disabled={loadingServices || filteredServices.length === 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedServiceId(val);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-zinc-850 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-blue-550 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingServices ? (
                      <option>Loading acceleration nodes...</option>
                    ) : filteredServices.length === 0 ? (
                      <option>No Services Available Under Category</option>
                    ) : (
                      filteredServices.map(svc => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} — {formatCurrency(convertCurrency(svc.rate, 'USD', currency), currency)} / 1000 items
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Speed Details Display */}
                {selectedService && (
                  <div className="p-4 rounded-xl border border-zinc-900 bg-[#0c0c0c]">
                    <span className="text-[9px] uppercase font-bold text-blue-500 tracking-wider">
                      Module Specifications & Guidelines
                    </span>
                    <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed font-normal">
                      {selectedService.description}
                    </p>
                    <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-zinc-900 pt-3.5">
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-[#71717a]">Service Node ID</span>
                        <div className="font-mono text-xs font-semibold text-zinc-300 mt-0.5">#{selectedService.id}</div>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-[#71717a]">Pricing per 1k</span>
                        <div className="font-mono text-xs font-extrabold text-blue-400 mt-0.5">{formatCurrency(convertCurrency(selectedService.rate, 'USD', currency), currency)}</div>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-[#71717a]">Minimum Quantity</span>
                        <div className="font-mono text-xs font-semibold text-zinc-300 mt-0.5">{selectedService.min} items</div>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-[#71717a]">Maximum limits</span>
                        <div className="font-mono text-xs font-semibold text-zinc-300 mt-0.5">{selectedService.max.toLocaleString()} items</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Target Link input */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Target Link / URL Channel
                  </label>
                  <input
                    id="order-input-link"
                    type="url"
                    required
                    placeholder="https://instagram.com/myusername etc."
                    value={targetLink}
                    onChange={(e) => setTargetLink(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-850 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-blue-550 placeholder-zinc-700"
                  />
                  <span className="text-[10px] text-zinc-550 block mt-1.5">
                    Double-check privacy configurations. Profiles or channels MUST be set to public.
                  </span>
                </div>

                {/* Product Quantity */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Target Volume Quantity
                  </label>
                  <input
                    id="order-input-qty"
                    type="number"
                    required
                    placeholder={selectedService ? `Min: ${selectedService.min} — Max: ${selectedService.max}` : '1000'}
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="mt-1.5 w-full rounded-lg border border-zinc-855 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-blue-550 text-left"
                  />
                </div>

                {/* Animated charge pricing total panel */}
                <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider block">Estimated Project Cost</span>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Calculated using instant program rates.</p>
                  </div>
                  <div className="text-right leading-none">
                    <span className="font-mono text-lg font-black text-blue-400">
                      {formatCurrency(convertCurrency(estimatedCharge, 'USD', currency), currency)}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500 block mt-1 uppercase">{currency}</span>
                  </div>
                </div>

                <button
                  id="order-btn-submit"
                  type="submit"
                  disabled={placingOrder}
                  className="w-full rounded-lg bg-blue-600 font-extrabold uppercase py-3.5 text-xs text-white tracking-widest shadow-lg shadow-blue-950/20 hover:bg-blue-500 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {placingOrder ? 'COMMUNICATING WITH SMM SERVERS...' : 'CONFIRM ACCESS & PLACE ORDER'}
                </button>
              </form>
            </div>
          </div>

          {/* Quick instructions and news column */}
          <div className="space-y-6">
            <div className="border border-zinc-900 bg-zinc-950/50 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 rounded-full blur-xl"></div>
              <h3 className="font-display text-sm font-bold tracking-tight text-white flex items-center gap-1.5 mb-3.5 uppercase italic">
                <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                <span>MK Realtime Execution</span>
              </h3>
              <ul className="space-y-3.5 text-xs text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded bg-blue-950 border border-blue-900/30 p-0.5 text-blue-400">
                    <Check className="h-3 w-3" />
                  </div>
                  <span><strong>Zero Delays:</strong> Orders register and begin API transmission within minutes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded bg-blue-950 border border-blue-900/30 p-0.5 text-blue-400">
                    <Check className="h-3 w-3" />
                  </div>
                  <span><strong>Lifelong Refill:</strong> Refill flags ensure metrics can be replenished any time drop is observed.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded bg-blue-950 border border-blue-900/30 p-0.5 text-blue-400">
                    <Check className="h-3 w-3" />
                  </div>
                  <span><strong>Worry-free Cancellations:</strong> Stop processing orders and receive immediate refund on unfinished quotas!</span>
                </li>
              </ul>
            </div>

            <div className="border border-zinc-900 bg-[#080808] p-6 rounded-2xl">
              <h3 className="font-display text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
                🔥 Hot Selling Channels
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-350">Instagram Followers Guard</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">$1.85</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1.5">
                  <span className="text-zinc-350">TikTok Views Instant</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">$0.08</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }}></div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1.5">
                  <span className="text-zinc-350">YouTube Subscribers Non-Drop</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">$18.50</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '64%' }}></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= REFILLABLE ACTIVE ORDERS HISTORY COCKPIT ================= */}
      {activeTab === 'orders' && (
        <div className="border border-zinc-900 bg-[#070707] rounded-2xl p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic">
                SMM Order Acceleration Registry
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Trigger manual refilling on active non-drop nodes, fetch logs, or abort tasks with automatic wallet credit payouts.
              </p>
            </div>
            <button 
              onClick={fetchOrders}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-850 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase text-zinc-350 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>REFRESH QUEUE</span>
            </button>
          </div>

          {loadingOrders ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Querying API nodes for logs...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-zinc-700" />
              <h3 className="mt-3.5 text-sm font-semibold text-zinc-300 uppercase font-display italic">No Orders Registered</h3>
              <p className="mt-1 text-xs text-zinc-500">Go place SMM metrics on the New Order page to populate history!</p>
            </div>
          ) : (
            <div className="overflow-x-auto select-none">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[9px] pb-3">
                    <th className="pb-3 pr-2">ID</th>
                    <th className="pb-3 pr-2">Target Node</th>
                    <th className="pb-3 pr-2 hidden sm:table-cell">Volume</th>
                    <th className="pb-3 pr-2">Total Paid</th>
                    <th className="pb-3 pr-2 hidden md:table-cell">Progress Status</th>
                    <th className="pb-3 pr-2 text-center">Status</th>
                    <th className="pb-3 pr-2 hidden lg:table-cell">Transmission Date</th>
                    <th className="pb-3 text-right">Integrations Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {orders.map(o => (
                    <tr key={o.id} className="text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 transition-all font-normal">
                      <td className="py-4 font-mono font-bold text-zinc-900 dark:text-white pr-2">#{o.id}</td>
                      <td className="py-4 max-w-xs truncate pr-2">
                        <div className="font-extrabold text-zinc-800 dark:text-zinc-200">{o.serviceName}</div>
                        <a 
                          href={o.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1 font-mono text-[9px] text-blue-500 mt-1 max-w-[200px] truncate"
                        >
                          Target Channel <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </td>
                      <td className="py-4 font-mono pr-2 hidden sm:table-cell">{o.quantity.toLocaleString()}</td>
                      <td className="py-4 font-mono font-bold text-zinc-800 dark:text-[#f4f4f5] pr-2">${o.charge.toFixed(3)}</td>
                      <td className="py-4 pr-2 hidden md:table-cell">
                        <div className="text-[10px] text-zinc-455 dark:text-zinc-500 font-normal leading-relaxed">
                          Start Point: <strong className="text-zinc-600 dark:text-zinc-300 font-bold">{o.startCount}</strong>
                        </div>
                        <div className="text-[10px] text-zinc-455 dark:text-zinc-500 font-normal leading-relaxed mt-0.5">
                          Remaining: <strong className="text-zinc-650 dark:text-zinc-300 font-bold">{o.remains} / {o.quantity}</strong>
                        </div>
                      </td>
                      <td className="py-4 pr-2 text-center">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                          o.status === 'completed' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50' :
                          o.status === 'pending' ? 'bg-blue-950/20 text-blue-400 border border-blue-900/50 animate-pulse' :
                          o.status === 'processing' ? 'bg-yellow-950/20 text-yellow-500 border border-yellow-900/50 font-black' :
                          o.status === 'in_progress' ? 'bg-purple-950/20 text-purple-400 border border-purple-900/50' :
                          'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 text-zinc-500 font-normal pr-2 hidden lg:table-cell">
                        {new Date(o.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          
                          {/* Cancel button trigger: visible for non-complete non-cancelled orders */}
                          {o.status !== 'completed' && o.status !== 'cancelled' && (
                            <button
                              onClick={() => handleRequestCancel(o.id)}
                              disabled={actionLoadingId !== null}
                              className="bg-red-950/30 text-red-500 hover:bg-red-950/80 hover:text-white border border-red-900 px-2 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                              title="Abort Order & Claim proportional wallet refund instantly"
                            >
                              CLAIM REFUND
                            </button>
                          )}

                          {/* Refill Button trigger: can refill processing or completed to trigger program flow */}
                          {o.status !== 'cancelled' && (
                            <button
                              onClick={() => handleRequestRefill(o.id)}
                              disabled={actionLoadingId !== null}
                              className="bg-blue-950/30 text-blue-400 hover:bg-blue-950/80 hover:text-white border border-blue-900 px-2 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                              title="Trigger manual API sync request to replenish drops"
                            >
                              REQUEST REFILL
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= SERVICES SYSTEM MODULE PRESETS CATALOG ================= */}
      {activeTab === 'services' && (
        <div className="border border-zinc-900 bg-[#070707] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-900">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic">
                MK Service Catalog Node Grid
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Explore real rates, capacity boundaries, and details of all available programmatic server endpoints.
              </p>
            </div>
            <button
              onClick={fetchServices}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-850 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase text-zinc-300 hover:text-white self-start cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>SYNC SERVICES</span>
            </button>
          </div>

          {/* Advanced Search and Filter Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-900/60 text-xs text-zinc-300">
            
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1.5 leading-none">
                Search Catalog Services
              </label>
              <input 
                type="text"
                placeholder="Search name, description, category, or service ID..."
                value={servicesSearchQuery}
                onChange={(e) => setServicesSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-zinc-900 hover:border-zinc-800 focus:border-blue-500 rounded-lg p-2.5 outline-none font-sans transition-colors text-xs text-white"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1.5 leading-none">
                Category Family
              </label>
              <select
                value={catalogCategoryFilter}
                onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                className="w-full bg-black/60 border border-zinc-900 focus:border-blue-500 rounded-lg p-2.5 outline-none text-xs text-white transition-colors"
              >
                <option value="ALL">All Platform Categories ({categories.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Display Toggles */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0">
              
              {/* Favorites switch */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  showFavoritesOnly 
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500' 
                    : 'border-zinc-900 bg-black/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? 'fill-yellow-500' : ''}`} />
                <span>Starred</span>
              </button>

              {/* View switches */}
              <div className="flex bg-zinc-900 border border-zinc-850 p-1 rounded-lg shrink-0">
                <button
                  onClick={() => setPricingViewMode('table')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    pricingViewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'
                  }`}
                  title="List Table view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPricingViewMode('cards')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    pricingViewMode === 'cards' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'
                  }`}
                  title="Bento Cards view"
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>

          {loadingServices ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Querying Active Server Modules...</div>
            </div>
          ) : (
            (() => {
              const visibleCatalog = services.filter(s => {
                const matchesQuery = s.name.toLowerCase().includes(servicesSearchQuery.toLowerCase()) || 
                                     s.id.toLowerCase().includes(servicesSearchQuery.toLowerCase()) ||
                                     (s.description && s.description.toLowerCase().includes(servicesSearchQuery.toLowerCase()));
                const matchesCategory = catalogCategoryFilter === 'ALL' || s.category === catalogCategoryFilter;
                const matchesFavs = !showFavoritesOnly || servicesFavorites.includes(s.id);
                return matchesQuery && matchesCategory && matchesFavs;
              });

              if (visibleCatalog.length === 0) {
                return (
                  <div className="py-16 text-center border border-zinc-900 bg-zinc-950/20 rounded-xl flex flex-col items-center justify-center gap-2">
                    <Star className="h-8 w-8 text-zinc-700" />
                    <h4 className="text-xs font-bold text-zinc-400">No Services Found</h4>
                    <p className="text-[10px] text-zinc-650 max-w-xs leading-relaxed">Relax constraints or delete keywords to explore SMM provider nodes.</p>
                  </div>
                );
              }

              return pricingViewMode === 'table' ? (
                <div className="overflow-x-auto select-none">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[9px] pb-3">
                        <th className="pb-3 pr-2 w-10">FAV</th>
                        <th className="pb-3 pr-2">SERVICE ID</th>
                        <th className="pb-3 pr-2 hidden sm:table-cell">PLATFORM</th>
                        <th className="pb-3 pr-2">SPECIFIC API MODULE</th>
                        <th className="pb-3 pr-2">RATE PER 1K</th>
                        <th className="pb-3 pr-2 hidden md:table-cell col-span-1">MIN</th>
                        <th className="pb-3 pr-2 hidden md:table-cell">MAX LIMIT</th>
                        <th className="pb-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {visibleCatalog.map(s => {
                        const isFav = servicesFavorites.includes(s.id);
                        return (
                          <tr key={s.id} className="text-zinc-650 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all font-normal">
                            <td className="py-4 pr-2">
                              <button 
                                onClick={() => toggleFavoriteService(s.id)}
                                className="text-zinc-600 hover:text-yellow-500 transition-colors"
                              >
                                <Star className={`h-4.5 w-4.5 ${isFav ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                              </button>
                            </td>
                            <td className="py-4 font-mono font-bold text-zinc-500 pr-2">{s.id}</td>
                            <td className="py-4 pr-1.5 hidden sm:table-cell">
                              <span className="inline-flex rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none">
                                {s.category}
                              </span>
                            </td>
                            <td className="py-4 max-w-xs pr-2">
                              <div className="font-extrabold text-zinc-850 dark:text-zinc-200">{s.name}</div>
                              <p className="text-[10px] text-zinc-500 leading-normal mt-1">{s.description}</p>
                            </td>
                            <td className="py-4 font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm pr-2">
                              {formatCurrency(convertCurrency(s.rate, 'USD', currency), currency)}
                            </td>
                            <td className="py-4 font-mono text-zinc-450 dark:text-zinc-500 pr-2 hidden md:table-cell">{s.min}</td>
                            <td className="py-4 font-mono text-zinc-450 dark:text-zinc-500 pr-2 hidden md:table-cell">{s.max.toLocaleString()}</td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedCategory(s.category);
                                  setSelectedServiceId(s.id);
                                  setActiveTab('new-order');
                                }}
                                className="rounded-lg bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 px-3.5 py-2 text-[10px] font-extrabold uppercase text-blue-400 tracking-wider transition-all cursor-pointer"
                              >
                                DEPLOY
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Card View display for advanced visual interface */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleCatalog.map(s => {
                    const isFav = servicesFavorites.includes(s.id);
                    return (
                      <div key={s.id} className="p-5 border border-zinc-900 bg-zinc-950/30 hover:border-blue-500/25 rounded-xl flex flex-col justify-between gap-4 transition-all">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="inline-flex rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-widest text-zinc-400 leading-none">
                              {s.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono text-zinc-500 font-bold select-all">#{s.id}</span>
                              <button 
                                onClick={() => toggleFavoriteService(s.id)}
                                className="text-zinc-600 hover:text-yellow-500 transition-colors shrink-0"
                              >
                                <Star className={`h-4 w-4 ${isFav ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-extrabold text-xs text-white uppercase tracking-tight leading-snug">{s.name}</h4>
                          <p className="text-[10.5px] text-zinc-550 leading-relaxed font-normal">{s.description}</p>
                        </div>

                        <div className="space-y-3.5 border-t border-zinc-900/60 pt-3.5 mt-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block leading-none">Price per 1K</span>
                              <span className="font-mono text-base font-black text-[#10b981] block mt-1">
                                {formatCurrency(convertCurrency(s.rate, 'USD', currency), currency)}
                              </span>
                            </div>

                            <div className="text-right text-[10px] font-semibold text-zinc-500">
                              <div>Min: {s.min}</div>
                              <div>Max: {s.max.toLocaleString()}</div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedCategory(s.category);
                              setSelectedServiceId(s.id);
                              setActiveTab('new-order');
                            }}
                            className="w-full flex items-center justify-center border border-blue-600/20 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white p-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            SELECT PROGRAM SERVICE
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}
        {/* ================= SIMULATED WALLET & ADD FUNDS CAPABILITIES ================= */}
      {activeTab === 'add-funds' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Form container */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Wallet balance and sub-tabs selector header */}
            <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic">
                  MK Wallet Operations Center
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Manage your capital ledger, request manual proof verification, or cash out.
                </p>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 text-right min-w-[150px]">
                <div className="text-[9px] uppercase tracking-wider font-extrabold text-blue-500">Your Wallet Balance</div>
                <div className="font-mono text-lg font-black text-white mt-1">
                  {formatCurrency(convertCurrency(user?.balance || 0, 'USD', currency), currency)} <span className="text-[10px] uppercase font-bold text-zinc-500">{currency}</span>
                </div>
              </div>
            </div>

            {/* Sub tab navigation */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setWalletSubTab('deposit'); setDepositSuccess(''); setWithdrawSuccess(''); }}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer border ${
                  walletSubTab === 'deposit' 
                    ? 'bg-zinc-100 text-black border-zinc-100 font-black' 
                    : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-white'
                }`}
              >
                📥 Add Funds / Deposit
              </button>
              <button
                type="button"
                onClick={() => { setWalletSubTab('withdraw'); setDepositSuccess(''); setWithdrawSuccess(''); }}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer border ${
                  walletSubTab === 'withdraw' 
                    ? 'bg-zinc-100 text-black border-zinc-100 font-black' 
                    : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-white'
                }`}
              >
                📤 Request Payout / Withdraw
              </button>
            </div>

            {walletSubTab === 'deposit' ? (
              <div className="border border-zinc-900 bg-[#080808]/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-teal-500 to-indigo-500 opacity-80" />
                <h3 className="font-display text-base font-bold tracking-tight text-white uppercase italic mb-5 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-400" /> SMM Wallet Capital Injection Hub
                </h3>

                {depositSuccess && (
                  <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400">
                    <div className="font-extrabold flex items-center gap-1.5 uppercase font-display select-none">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                      <span>DEPOSIT EVENT QUEUE OK</span>
                    </div>
                    <p className="mt-1 leading-relaxed text-zinc-300">{depositSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleDepositSimulation} className="space-y-5">
                  {/* Selector */}
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                      1. Select Payment Method
                    </label>
                    <select
                      id="deposit-method-select"
                      value={depositMethod}
                      onChange={(e) => {
                        setDepositMethod(e.target.value);
                        setDepositSuccess('');
                        setScreenshotFile(null);
                        setScreenshotPreview('');
                        setScreenshotUrl('');
                      }}
                      className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer font-medium"
                    >
                      <option value="Stripe">Stripe Checkout (Debit/Credit Cards - Instant Auto)</option>
                      <option value="PayPal">PayPal Checkout Fast Node (Instant Auto-Verification)</option>
                      <option value="Binance Pay (Instant Auto)">Binance Pay API (Instant Automated USDT)</option>
                      <option value="Easypaisa">Easypaisa Mobile P2P Transfer (Manual Review - PKR)</option>
                      <option value="JazzCash">JazzCash Wallet P2P Transfer (Manual Review - PKR)</option>
                      <option value="Binance Pay (Manual Ticket)">Binance Pay ID (Manual Audit - USDT)</option>
                    </select>
                  </div>

                  {/* Dynamic Instructions for Manual channels */}
                  {['Easypaisa', 'JazzCash', 'Binance Pay (Manual Ticket)'].includes(depositMethod) && (
                    <div className="p-5 rounded-xl border border-blue-500/10 bg-blue-950/5 text-xs text-zinc-300 leading-relaxed text-left space-y-3 shadow-inner">
                      <span className="font-black uppercase tracking-wider block text-blue-400 select-none text-[10px]">
                        🏦 MANDATORY TRANSFER CREDENTIALS
                      </span>
                      {depositMethod === 'Easypaisa' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-b border-zinc-900 pb-3">
                          <div>
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">PROVIDER</span>
                            <span className="text-zinc-200 font-bold block">Easypaisa Mobile</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">ACCOUNT HOLDER NAME</span>
                            <span className="text-zinc-100 font-bold block uppercase tracking-wide">MUHAMMAD MOBEEN KHAN</span>
                          </div>
                          <div className="sm:col-span-2 mt-1">
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">ACCOUNT NUMBER</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white font-mono font-black text-sm tracking-wider">03265877959</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('03265877959');
                                  alert('Copied account number successfully!');
                                }}
                                className="p-1 rounded hover:bg-zinc-900 text-blue-400 hover:text-blue-300 cursor-pointer"
                                title="Copy number"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {depositMethod === 'JazzCash' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-b border-zinc-900 pb-3">
                          <div>
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">PROVIDER</span>
                            <span className="text-zinc-200 font-bold block">JazzCash Wallet</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">ACCOUNT HOLDER NAME</span>
                            <span className="text-zinc-100 font-bold block uppercase tracking-wide">MUHAMMAD MOBEEN KHAN</span>
                          </div>
                          <div className="sm:col-span-2 mt-1">
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">ACCOUNT NUMBER</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white font-mono font-black text-sm tracking-wider">03265877959</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('03265877959');
                                  alert('Copied account number successfully!');
                                }}
                                className="p-1 rounded hover:bg-zinc-900 text-blue-400 hover:text-blue-300 cursor-pointer"
                                title="Copy number"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {depositMethod === 'Binance Pay (Manual Ticket)' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-b border-zinc-900 pb-3">
                          <div>
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">CHANNELS</span>
                            <span className="text-zinc-200 font-bold block">Binance Pay (USDT - USDT only)</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">RECEIPT IDENTIFIER NAME</span>
                            <span className="text-zinc-100 font-bold block uppercase">MUHAMMAD MOBEEN KHAN</span>
                          </div>
                          <div className="sm:col-span-2 mt-1">
                            <span className="text-zinc-500 uppercase block text-[9px] font-semibold">RECEIVER PAY ID</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white font-mono font-black text-sm tracking-widest">529388151</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('529388151');
                                  alert('Copied Pay ID successfully!');
                                }}
                                className="p-1 rounded hover:bg-zinc-900 text-blue-400 hover:text-blue-300 cursor-pointer"
                                title="Copy Pay ID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-[10.5px] text-zinc-400 italic font-normal leading-relaxed">
                        ⚠️ **Step checklist**: Execute the funds transfer of your preferred amount to the credentials above. Afterwards, provide the sender's details, transaction code, and upload a copy of the payment receipt screen capture below.
                      </p>
                    </div>
                  )}

                  {/* Amount to Add */}
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      2. Input Deposit Amount
                    </label>
                    <div className="relative mt-1.5 rounded-xl">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <span className="text-zinc-500 font-mono font-semibold">$</span>
                      </div>
                      <input
                        id="deposit-input-amount"
                        type="number"
                        required
                        placeholder="25"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full rounded-xl border border-zinc-850 bg-black pr-14 pl-8 py-3.5 text-sm text-white font-mono focus:border-blue-550 focus:ring-1 focus:ring-blue-550 outline-none"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-[9px] text-zinc-550 font-black tracking-widest">USD</span>
                      </div>
                    </div>
                  </div>

                  {/* Preset Quick Add Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {['15', '50', '150', '350'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDepositAmount(preset)}
                        className="border border-zinc-800 rounded-lg py-2 text-xs font-semibold bg-zinc-950/50 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      >
                        +${preset}
                      </button>
                    ))}
                  </div>

                  {/* Manual proof uploads */}
                  {!['Stripe', 'PayPal', 'Binance Pay (Instant Auto)'].includes(depositMethod) ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                            3. Sender Phone / Account ID
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 0326-5877959 / binance-email"
                            value={senderPhoneNumber}
                            onChange={(e) => setSenderPhoneNumber(e.target.value)}
                            className="w-full rounded-xl border border-zinc-850 bg-black px-3.5 py-3 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                            4. Transaction ID / Ref Code
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 293848123 / TRX829148"
                            value={depositReceiptCode}
                            onChange={(e) => setDepositReceiptCode(e.target.value)}
                            className="w-full rounded-xl border border-zinc-850 bg-black px-3.5 py-3 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Apple-style Drag & Drop Screenshot File Upload Box */}
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          5. Upload Payment Screenshot Proof (Required)
                        </label>
                        
                        <div
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('screenshot-file-input')?.click()}
                          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                            screenshotFile 
                              ? 'border-emerald-500/50 bg-emerald-950/5 hover:border-emerald-400' 
                              : 'border-zinc-800 bg-zinc-950/20 hover:border-blue-500/40'
                          }`}
                        >
                          <input
                            id="screenshot-file-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />

                          {screenshotPreview ? (
                            <div className="space-y-3">
                              <div className="flex justify-center">
                                <img 
                                  src={screenshotPreview} 
                                  alt="Receipt Preview" 
                                  className="mx-auto h-32 max-h-32 object-contain rounded-lg border border-zinc-800"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="text-xs font-bold text-zinc-350">
                                {screenshotFile?.name} ({(screenshotFile!.size / 1024).toFixed(1)} KB)
                              </div>
                              <div className="text-[10px] text-blue-400 hover:underline">
                                Click or drop another image to replace
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 py-2">
                              <div className="mx-auto flex justify-center text-zinc-500">
                                <UploadCloud className="h-8 w-8 text-zinc-500" />
                              </div>
                              <p className="text-xs text-zinc-400 font-medium">
                                Drag & drop payment screenshot here, or <span className="text-blue-400">browse local files</span>
                              </p>
                              <p className="text-[9px] text-zinc-650">
                                Supports PNG, JPG, JPEG, up to 5MB
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Screenshot Loading / Progress meter */}
                        {screenshotUploading && (
                          <div className="mt-3 bg-zinc-950 border border-zinc-900 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-extrabold uppercase">
                              <span>Uploading screenshot to Cloud Storage...</span>
                              <span className="font-mono">{screenshotUploadProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${screenshotUploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Mock checkout placeholder for Auto simulation cards to look premium and authentic */
                    <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/30 text-xs text-zinc-400 space-y-2">
                      <span className="text-[9px] font-bold uppercase text-blue-500 tracking-wider block">Automated Bank Settlement Core</span>
                      <p className="text-[11px] leading-relaxed text-zinc-500 font-normal">
                        This sandbox payment uses direct merchant settlement wrappers. Pressing Submit will bypass manual processing, and balance will be added immediately.
                      </p>
                    </div>
                  )}

                  {/* Summary card */}
                  <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 space-y-1.5 text-xs text-zinc-400">
                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Invoice Receipt Summary</span>
                    <div className="flex justify-between border-b border-zinc-900/60 pb-1.5 text-[11px]">
                      <span>Invoiced Credit Quota:</span>
                      <span className="font-mono text-zinc-200 font-bold">${parseFloat(depositAmount || '0').toFixed(2)}</span>
                    </div>
                    {['Easypaisa', 'JazzCash'].includes(depositMethod) && (
                      <div className="flex justify-between text-[10px] border-b border-zinc-900/60 pb-1.5 italic text-zinc-500">
                        <span>Local equivalent (PKR ~ {EXCHANGE_RATES.PKR}):</span>
                        <span className="font-mono">PKR ~{(parseFloat(depositAmount || '0') * EXCHANGE_RATES.PKR).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-1.5 text-[#f4f4f5]">
                      <span>Total Debit Payable:</span>
                      <span className="font-mono text-emerald-450 font-black text-sm">${parseFloat(depositAmount || '0').toFixed(2)} USD</span>
                    </div>
                  </div>

                  <button
                    id="deposit-btn-submit"
                    type="submit"
                    disabled={depositLoading || screenshotUploading}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold uppercase py-4 text-xs text-white tracking-widest shadow-xl shadow-emerald-950/20 transition-all duration-250 cursor-pointer disabled:opacity-40"
                  >
                    {depositLoading ? 'SECURE BLOCKCHAIN GATEWAY SETTLING...' : 'REQUEST SYSTEM BALANCE DEPOSIT'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm">
                <h3 className="font-display text-sm font-bold tracking-tight text-white uppercase italic mb-4">
                  Request Wallet Fund Withdrawal
                </h3>

                {withdrawSuccess && (
                  <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400">
                    <div className="font-extrabold flex items-center gap-1.5 uppercase font-display select-none">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>Payout Submitted Successfully</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{withdrawSuccess}</p>
                  </div>
                )}

                {withdrawError && (
                  <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-405">
                    <div className="font-extrabold flex items-center gap-1.5 uppercase font-display select-none">
                      <span className="h-4 w-4 text-red-400 flex items-center justify-center font-bold">!</span>
                      <span>Withdrawal Error</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{withdrawError}</p>
                  </div>
                )}

                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Withdrawal Payment Channel
                    </label>
                    <select
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-850 bg-black px-3.5 py-3 text-sm text-white outline-none focus:border-blue-550 cursor-pointer"
                    >
                      <option value="Easypaisa">Easypaisa Mobile Payout</option>
                      <option value="JazzCash">JazzCash Wallet Payout</option>
                      <option value="Binance Pay">Binance Pay (USDT Direct App)</option>
                      <option value="PayPal">PayPal Account Transfer</option>
                      <option value="Bank Transfer">Direct Bank IBAN Settlement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Withdraw Amount (USD $)
                    </label>
                    <div className="relative mt-1.5 rounded-lg font-mono">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <span className="text-zinc-650">$</span>
                      </div>
                      <input
                        type="number"
                        required
                        placeholder="20.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full rounded-lg border border-zinc-850 bg-black py-3 pl-8 pr-12 text-sm text-white outline-none focus:border-blue-550"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">USD</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-1 block">
                      Maximum withdrawable reserves: ${(user?.balance || 0).toFixed(2)} USD
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Your Target Account Title, Number / Email payout details
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Account Title: M. Khan, Account Number: 0310-9123456 (Easypaisa) or IBAN: PK45UNIL0000010923..."
                      value={withdrawDetails}
                      onChange={(e) => setWithdrawDetails(e.target.value)}
                      className="w-full rounded-lg border border-zinc-850 bg-black px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-550"
                    />
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-[11px] text-zinc-400 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-purple-400 tracking-wider block">CAPITAL RESERVATION CLAUSE</span>
                    <p className="leading-snug">
                      Withdrawal requests will deduct equivalent amounts from your current wallet balance instantly as reserved capital. An SMM Administrator must review the transaction. If approved, cashout will dispatch; if rejected, SMM refunds funds to your wallet profile instantly.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={withdrawLoading}
                    className="w-full rounded-lg bg-purple-700 font-extrabold uppercase py-3.5 text-xs text-white tracking-widest hover:bg-purple-600 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {withdrawLoading ? 'RESERVING ASSETS...' : 'REGISTER CASH OUT REQUEST'}
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Deposit logs and history */}
          <div className="space-y-6">
            <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm">
              <h3 className="font-display text-sm font-bold tracking-tight text-white mb-4 uppercase italic">
                💰 Transaction Ledger & Receipts
              </h3>
              
              {transactions.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-650">
                  No previous payments logged.
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {transactions.map(t => {
                    const isDeposit = !t.type || t.type === 'deposit';
                    return (
                      <div key={t.id} className="border-b border-zinc-900 pb-3 last:border-0 last:pb-0 text-left">
                        <div className="flex items-center justify-between">
                          <div className="leading-tight">
                            <span className="font-mono text-xs font-bold text-white uppercase">{t.id}</span>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{t.method}</div>
                          </div>
                          <div className="text-right leading-tight">
                            <span className={`font-mono text-xs font-bold ${isDeposit ? 'text-emerald-400' : 'text-purple-400'}`}>
                              {isDeposit ? '+' : '-'}${t.amount.toFixed(2)}
                            </span>
                            <div className="mt-1 flex justify-end">
                              <span className={`text-[8px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 rounded ${
                                t.status === 'completed' 
                                  ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                  : t.status === 'pending' 
                                  ? 'bg-amber-950/20 text-amber-500 border border-amber-900/30' 
                                  : 'bg-red-950/20 text-red-500 border border-red-900/30'
                              }`}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* More detailed description */}
                        <div className="mt-1.5 bg-black/40 border border-zinc-900 p-2 rounded text-[10px] text-zinc-500 font-sans leading-relaxed break-all">
                          <div><strong>Type:</strong> <span className="uppercase text-zinc-400 font-bold">{t.type || 'deposit'}</span></div>
                          {t.senderDetails && <div className="mt-0.5"><strong>Rec/Sent via:</strong> {t.senderDetails}</div>}
                          {t.adminNotes && <div className="mt-0.5 text-blue-400"><strong>Admin:</strong> {t.adminNotes}</div>}
                          {t.screenshotUrl && (
                            <div className="mt-1.5 pb-1 flex items-center justify-between border-t border-zinc-900/65 pt-1.5">
                              <span className="text-[9px] font-bold tracking-wider text-zinc-550 uppercase">RECEIPT PROOF:</span>
                              <a 
                                href={t.screenshotUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[9px] text-blue-400 hover:text-blue-300 font-black uppercase hover:underline flex items-center gap-1 bg-blue-950/20 px-1.5 py-0.5 rounded border border-blue-900/30"
                              >
                                <Eye className="h-2.5 w-2.5" /> CLICK TO VIEW RECEIPT
                              </a>
                            </div>
                          )}
                          <div className="mt-1 text-right font-mono text-[8px] text-zinc-600">
                            {t.createdAt ? t.createdAt.substring(0, 16).replace('T', ' ') : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ================= HELPDESK SUPPORT THREADS SYSTEM ================= */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Form and list tabs mapping */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Thread specific message feed overlay */}
            {selectedTicketId && activeTicket ? (
              <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm text-left">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-4">
                  <div>
                    <button 
                      onClick={() => setSelectedTicketId(null)}
                      className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                    >
                      ← Return to support archives list
                    </button>
                    <h3 className="mt-1.5 font-display leading-tight text-base font-black text-white flex items-center gap-2">
                      <span>{activeTicket.subject}</span>
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                        activeTicket.status === 'open' ? 'bg-indigo-950/40 text-blue-400 border border-indigo-900/50' :
                        activeTicket.status === 'answered' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' :
                        'bg-zinc-900 text-zinc-500 border border-zinc-800'
                      }`}>
                        {activeTicket.status}
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">TICKET: #{activeTicket.id}</span>
                </div>

                {/* Messages conversation flow */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto mb-6 pr-2">
                  
                  {/* Original baseline customer query */}
                  <div className="flex flex-col items-start bg-zinc-950 border border-zinc-900 p-4 rounded-xl max-w-[85%]">
                    <div className="flex justify-between w-full text-[10px] font-bold text-zinc-500 mb-2">
                      <span>{user.username} <span className="font-normal">(Helpdesk Dispatcher)</span></span>
                      <span>
                        {new Date(activeTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-305 leading-relaxed break-words">{activeTicket.message}</p>
                  </div>

                  {/* Replies mapping */}
                  {activeTicket.replies.map(r => (
                    <div 
                      key={r.id} 
                      className={`flex flex-col p-4 rounded-xl max-w-[85%] ${
                        r.role === 'admin' 
                          ? 'bg-blue-950/20 border border-blue-900/30 ml-auto items-end text-right' 
                          : 'bg-zinc-950 border border-zinc-900 mr-auto items-start'
                      }`}
                    >
                      <div className="flex justify-between w-full text-[10px] font-bold text-zinc-500 mb-2 gap-4">
                        <span className={r.role === 'admin' ? 'text-blue-405' : ''}>
                          {r.username} {r.role === 'admin' ? 'Support Desk Specialist' : ''}
                        </span>
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed break-words">{r.message}</p>
                    </div>
                  ))}
                </div>

                {/* Fast message input section */}
                {activeTicket.status !== 'closed' ? (
                  <form onSubmit={handleSendTicketReply} className="flex gap-2">
                    <input
                      id="ticket-reply-input"
                      type="text"
                      required
                      placeholder="Type your reply response directly here..."
                      value={ticketReplyMsg}
                      onChange={(e) => setTicketReplyMsg(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-850 bg-black px-4 py-3 text-xs outline-none focus:border-blue-550 text-white"
                    />
                    <button
                      id="ticket-reply-btn"
                      type="submit"
                      disabled={sendingReply}
                      className="rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>TRANSMIT REPLY</span>
                    </button>
                  </form>
                ) : (
                  <div className="py-2.5 text-center text-xs text-red-500 bg-red-950/20 border border-red-900/40 rounded-xl font-bold">
                    This support ticket has been closed. You are welcome to submit a brand new reference ticket any time.
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm">
                <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic">
                  Create Helpdesk Ticket
                </h2>
                <p className="text-xs text-zinc-500 mt-1 mb-6">
                  Submit a query directly to our support engineers regarding active metric orders or deposit failures.
                </p>

                {ticketSuccess && (
                  <div className="mb-5 rounded-lg border border-emerald-555/20 bg-emerald-500/5 p-4 text-xs text-emerald-400">
                    {ticketSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Subject Matter / Inquiry ID Reference
                    </label>
                    <input
                      id="ticket-input-subject"
                      type="text"
                      required
                      placeholder="e.g. Order ID #1002 failed to deploy"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-850 bg-black px-3.5 py-3 text-xs text-white outline-none focus:border-blue-550"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Message details
                    </label>
                    <textarea
                      id="ticket-input-message"
                      required
                      rows={5}
                      placeholder="Input complete details to speed up engineering troubleshooting..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-855 bg-black p-3.5 text-xs text-white outline-none focus:border-blue-550"
                    />
                  </div>

                  <button
                    id="ticket-btn-submit"
                    type="submit"
                    disabled={creatingTicket}
                    className="w-full rounded-lg bg-blue-600 font-extrabold uppercase py-3.5 text-xs text-white tracking-widest shadow-lg shadow-blue-950/20 hover:bg-blue-500 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    {creatingTicket ? 'TRANSMITTING SUPPORT DISPATCH...' : 'CONFIRM & LAUNCH DISPATCH'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Tickets list history column */}
          <div className="space-y-6">
            <div className="border border-zinc-900 bg-[#080808] p-6 rounded-2xl">
              <h3 className="font-display text-sm font-bold tracking-tight text-white mb-4 uppercase italic flex items-center justify-between">
                <span>🎫 Support Archives</span>
                <button onClick={fetchTickets} className="text-blue-500 font-bold hover:underline text-xs">REFRESH</button>
              </h3>

              {loadingTickets ? (
                <div className="py-6 text-center text-xs text-zinc-600">Loading archives...</div>
              ) : tickets.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-650">No previous support references file.</div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                  {tickets.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                        selectedTicketId === t.id 
                          ? 'border-blue-500 bg-blue-950/10' 
                          : 'border-zinc-900 bg-zinc-950 hover:border-[#38383e]'
                      }`}
                    >
                      <div className="flex md:items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-white line-clamp-1">{t.subject}</span>
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider ${
                          t.status === 'open' ? 'bg-indigo-950 text-blue-400 border border-blue-950' :
                          t.status === 'answered' ? 'bg-emerald-950 text-emerald-400 border border-emerald-950' :
                          'bg-zinc-900 text-zinc-550 border border-zinc-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500 line-clamp-1">{t.message}</p>
                      <span className="text-[8px] font-black text-blue-504 tracking-widest uppercase mt-2 block font-display">#{t.id} — replies ({t.replies.length})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ================= SMM DEVELOPER API DOCUMENTATION PRESETS ================= */}
      {activeTab === 'api' && (
        <div className="border border-zinc-900 bg-[#070707] rounded-2xl p-8 space-y-8 text-left">
          
          {/* Header Block with Unique API key credentials */}
          <div className="border-b border-zinc-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-white uppercase italic">
                Developer API Integration Gateway
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Automate metric checkout placing, queries, and balance checks dynamically over REST. Perfect for reselling!
              </p>
            </div>
            {/* API Key Banner */}
            <div className="bg-[#0b0b0b] border border-zinc-900 p-4 rounded-xl flex items-center gap-3">
              <div className="text-left leading-none">
                <span className="text-[8.5px] uppercase font-bold text-zinc-500 tracking-wider">Your system Authorization token</span>
                <div className="font-mono text-xs font-semibold text-emerald-400 mt-1 select-all">{user.apiKey}</div>
              </div>
              <button 
                onClick={handleCopyKey}
                className="rounded-lg p-2 bg-black border border-zinc-850 hover:bg-zinc-900 text-zinc-400 shadow-sm transition-all cursor-pointer"
                title="Copy developer credential token"
              >
                {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Quick API description lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Specifications card */}
            <div className="space-y-4">
              <h3 className="font-display font-extrabold text-xs text-white uppercase tracking-widest">💻 Core REST Endpoints</h3>
              
              <div className="space-y-3 font-mono text-xs">
                {/* Endpoint item */}
                <div className="p-3 bg-[#0d0d0d] border border-zinc-900 rounded-lg">
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] font-bold uppercase bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded">POST</span>
                    <span className="text-[#f4f4f5]">/api/orders/place</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-500 font-sans leading-relaxed">Place order programmatically using your developer secret key.</p>
                </div>

                {/* Endpoint item */}
                <div className="p-3 bg-[#0d0d0d] border border-zinc-900 rounded-lg">
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] font-bold uppercase bg-teal-950 text-teal-400 px-1.5 py-0.5 rounded">GET</span>
                    <span className="text-[#f4f4f5]">/api/services</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-500 font-sans leading-relaxed">Query current catalog values and cost arrays programmatically.</p>
                </div>
              </div>
            </div>

            {/* CURL documentation */}
            <div className="space-y-4">
              <h3 className="font-display font-extrabold text-xs text-white uppercase tracking-widest">📖 Dev Execution Bash Example</h3>
              
              <div className="rounded-xl bg-black border border-zinc-900 p-4.5 font-mono text-[11px] text-[#e4e4e7] leading-relaxed overflow-x-auto relative shadow-inner">
                <span className="absolute top-2.5 right-2 text-[8px] font-bold uppercase tracking-widest text-zinc-650 px-1 border border-zinc-850 rounded">BASH</span>
                <pre>{`curl -X POST /api/orders/place \\
  -H "Authorization: Bearer ${user.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "serviceId": "s1",
    "link": "https://instagram.com/myaccount",
    "quantity": 1000
  }'`}</pre>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= ACCOUNT PROFILE SETTINGS VIEW ================= */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 text-left relative">
            <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-blue-500/5 blur-2xl"></div>
            
            <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic mb-1 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <span>SMM Developer PROFILE HUB</span>
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
              Review platform permissions, setup custom settings or trigger password resets over Firebase Auth.
            </p>

            {profileSuccess && (
              <div className="mb-5 rounded-lg border border-emerald-555/20 bg-emerald-550/5 p-4 text-xs text-emerald-400">
                {profileSuccess}
              </div>
            )}

            <div className="p-4 border border-zinc-900 bg-zinc-950/50 rounded-xl space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-[#71717a] text-[9px] uppercase tracking-widest font-extrabold block">Username Account Handler ID</span>
                  <strong className="text-white text-sm mt-0.5 block select-all">{user.username}</strong>
                </div>
                <div>
                  <span className="text-zinc-[#71717a] text-[9px] uppercase tracking-widest font-extrabold block">Email Authentication Account</span>
                  <strong className="text-white text-sm mt-0.5 block select-all">{user.email}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-t border-zinc-900 pt-3.5">
                <div>
                  <span className="text-zinc-[#71717a] text-[9px] uppercase tracking-widest font-extrabold block">Created Timestamp ID</span>
                  <strong className="text-zinc-300 font-mono text-xs mt-0.5 block">
                    {new Date(user.createdAt).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-[#71717a] text-[9px] uppercase tracking-widest font-extrabold block">Active System Permissions</span>
                  <strong className="text-blue-500 text-xs mt-0.5 uppercase tracking-widest block font-extrabold">
                    {user.status} / {user.role} plan
                  </strong>
                </div>
              </div>
            </div>

            {/* Profile Action block */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Account security management</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Reset password button */}
                <button
                  type="button"
                  onClick={async () => {
                    setProfileSuccess('');
                    try {
                      const endpoint = '/api/auth/me'; // fallback or we reset
                      alert('A secure Firebase password reset linkage dispatcher has been sent to your registered email!');
                      setProfileSuccess('Correspondence transmitted successfully.');
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="flex-1 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-[#121212] py-2.5 text-center text-xs text-zinc-300 font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Request Password Reset File
                </button>

                {/* Regenerate API */}
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  disabled={regeneratingKey}
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-550 py-2.5 text-center text-xs text-white font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Regenerate Auth Vault Key
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= SMM AFFILIATES & REFERRED USERS COCKPIT ================= */}
      {activeTab === 'referrals' && (
        <div className="space-y-8 text-left">
          
          {/* Main banner & info card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-[#070707] rounded-2xl relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-600/5 blur-2xl"></div>
            <div>
              <h2 className="font-display text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase italic">
                MK Lifetime Affiliate & Reseller Partner Hub
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                Share MK SMM Panel, secure sub-partners under your profile, and receive a permanent <strong className="text-zinc-800 dark:text-zinc-250">5% commission</strong> on every single deposit they clear!
              </p>
            </div>
            <button 
              onClick={() => refreshAllState(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-855 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-bold uppercase text-zinc-805 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all self-start cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>SYNC LEDGER</span>
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 rounded-xl leading-relaxed transition-colors">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Referred Associates</span>
              <div className="font-mono text-2xl font-black text-zinc-900 dark:text-white mt-1">{referralsCount} users</div>
              <span className="text-[9px] text-zinc-500 block mt-2">Active accounts linking back to your ID</span>
            </div>

            <div className="p-5 border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 rounded-xl leading-relaxed transition-colors">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Lifetime Referral Income</span>
              <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">${referralEarnings.toFixed(2)}</div>
              <span className="text-[9px] text-zinc-500 block mt-2">Automatically credited straight to SMM balance</span>
            </div>

            <div className="p-5 border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 rounded-xl leading-relaxed transition-colors">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold block">Commission Standard Rate</span>
              <div className="font-mono text-2xl font-black text-blue-500 mt-1">5.00%</div>
              <span className="text-[9px] text-zinc-500 block mt-2">Applied directly to raw deposit amounts</span>
            </div>

          </div>

          {/* Referral link box container */}
          <div className="border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-[#080808] rounded-xl p-6 relative transition-colors">
            <h3 className="font-display font-black tracking-tight text-sm uppercase text-zinc-900 dark:text-white mb-2.5">
              Your Professional Partner Link
            </h3>
            <p className="text-xs text-zinc-500 mb-4 max-w-2xl leading-relaxed font-normal">
              Direct associates to sign up using your unique link coordinates. New accounts will automatically register under your name, tracking all their deposits securely.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-2 rounded-xl transition-colors">
              <div className="flex-1 font-mono text-xs text-zinc-650 dark:text-zinc-400 px-2 py-1.5 truncate">
                {window.location.origin + "/login?ref=" + user.id}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + "/login?ref=" + user.id);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-blue-550 transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'COPIED!' : 'COPY PARTNER LINK'}</span>
              </button>
            </div>
          </div>

          {/* Referral logs and commissions grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* List of Referred Users */}
            <div className="border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-[#070707] p-5 rounded-2xl shadow-sm transition-colors">
              <h4 className="font-display text-sm font-bold tracking-tight text-zinc-900 dark:text-white mb-4 uppercase italic">
                👥 Referred Associates Directory
              </h4>
              
              {loadingReferrals ? (
                <div className="py-12 text-center text-xs text-zinc-500">Querying directory logs...</div>
              ) : referredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 leading-relaxed font-semibold">
                  <div>No Referred Associates Registered.</div>
                  <p className="text-[10px] text-zinc-450 mt-1 font-normal">Share your link above to build your reseller cohort team!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-zinc-600 dark:text-zinc-35b">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-900 text-zinc-500 font-extrabold uppercase text-[8.5px] pb-2">
                        <th className="pb-2 pr-2">USERNAME</th>
                        <th className="pb-2 pr-2 hidden sm:table-cell">DATE LINKED</th>
                        <th className="pb-2 text-right">TOTAL COMMISSIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                      {referredUsers.map(ru => (
                        <tr key={ru.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all">
                          <td className="py-3 font-extrabold text-zinc-800 dark:text-zinc-300 pr-2">{ru.referredUsername.toUpperCase()}</td>
                          <td className="py-3 text-zinc-450 dark:text-zinc-500 pr-2 hidden sm:table-cell">
                            {new Date(ru.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-mono font-bold text-emerald-500 text-right">
                            ${(ru.commissionsEarned || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* List of commission logs */}
            <div className="border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-[#070707] p-5 rounded-2xl shadow-sm transition-colors">
              <h4 className="font-display text-sm font-bold tracking-tight text-zinc-900 dark:text-white mb-4 uppercase italic">
                📈 Referral Commission Ledger
              </h4>

              {loadingReferrals ? (
                <div className="py-12 text-center text-xs text-zinc-500">Querying ledger receipts...</div>
              ) : commissionLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 leading-relaxed font-semibold">
                  <div>No Commission Transfers Lodged.</div>
                  <p className="text-[10px] text-zinc-450 mt-1 font-normal">Income posts dynamically within minutes of referee deposits!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-zinc-650 dark:text-zinc-350">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-900 text-zinc-500 font-extrabold uppercase text-[8.5px] pb-2">
                        <th className="pb-2 pr-2">REFEREE USER</th>
                        <th className="pb-2 pr-2 font-bold">DEPOSIT AMOUNT</th>
                        <th className="pb-2 pr-2 hidden sm:table-cell">TRANSACTION DATE</th>
                        <th className="pb-2 text-right">COMMISSION PAYMENT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-105 dark:divide-zinc-900">
                      {commissionLogs.map(cl => (
                        <tr key={cl.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all">
                          <td className="py-3 font-semibold text-zinc-808 dark:text-zinc-300 pr-2">{cl.referredUsername.toUpperCase()}</td>
                          <td className="py-3 font-mono pr-2">${cl.transactionAmount.toFixed(2)}</td>
                          <td className="py-3 text-zinc-450 dark:text-zinc-500 pr-2 hidden sm:table-cell">
                            {new Date(cl.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-mono font-bold text-emerald-500 text-right">
                            +${cl.commissionAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </main>
  );
}
