/**
 * Code license: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, AlertCircle, RefreshCw, Server, Send, Globe, Key, ShieldCheck } from 'lucide-react';
import { formatCurrency, convertCurrency } from '../utils/currency';

interface ChildPanelProps {
  user: any;
  token: string;
  currency: string;
  onRefreshUser: () => void;
  onSubmitAuditLog: (log: any) => Promise<void>;
  onCreateTransaction: (tx: any) => Promise<any>;
}

export default function ChildPanel({
  user,
  token,
  currency = 'USD',
  onRefreshUser,
  onSubmitAuditLog,
  onCreateTransaction
}: ChildPanelProps) {
  const [domain, setDomain] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [panelCurrency, setPanelCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [orderedPanels, setOrderedPanels] = useState<any[]>(() => {
    const saved = localStorage.getItem(`mkSmm_child_panels_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const MONTHLY_PRICE_USD = 15.00;
  const localPrice = convertCurrency(MONTHLY_PRICE_USD, 'USD', currency);

  useEffect(() => {
    localStorage.setItem(`mkSmm_child_panels_${user.id}`, JSON.stringify(orderedPanels));
  }, [orderedPanels, user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!domain || !adminUser || !adminPass) {
      setError('Complete all system coordinates before dispatching orders.');
      return;
    }

    if (!domain.includes('.') || domain.length < 4) {
      setError('Ensure the target domain format represents a fully qualified zone (e.g., mysmmsellers.com).');
      return;
    }

    // Check user balance
    if (user.balance < MONTHLY_PRICE_USD) {
      setError(`Insufficient capital. Purchase requires ${formatCurrency(localPrice, currency)} (${formatCurrency(MONTHLY_PRICE_USD, 'USD')} equivalent).`);
      return;
    }

    if (!window.confirm(`Are you ready to purchase a personalized reseller child panel for ${formatCurrency(localPrice, currency)}/month? This will deduct funds immediately.`)) {
      return;
    }

    setLoading(true);
    try {
      // API call to charge balance & log withdrawal on the backend
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          amount: MONTHLY_PRICE_USD,
          method: 'SMM Cloud (Child Panel Monthly Lease)',
          status: 'completed',
          type: 'withdrawal',
          senderDetails: `DNS target: ${domain.toLowerCase()}`,
          adminNotes: `Allocated hosting block, initialized Admin profile: ${adminUser}. NS coordinates: ns1.mksmmpanel.info, ns2.mksmmpanel.info`
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to dispatch child panel capital ledger check.');
      }

      // Record child panel locally
      const newPanel = {
        id: 'cp_' + Math.random().toString(36).substring(2, 10),
        domain: domain.toLowerCase(),
        adminUser: adminUser.toLowerCase(),
        currency: panelCurrency,
        status: 'provisioning',
        priceUSD: MONTHLY_PRICE_USD,
        createdAt: new Date().toISOString()
      };

      setOrderedPanels(prev => [newPanel, ...prev]);
      setSuccess(`Your child SMM Panel coordinates has been initialized! Domain registration logged for processing. SMM network configuration is provisioning.`);
      setDomain('');
      setAdminUser('');
      setAdminPass('');
      
      // Refresh balance
      onRefreshUser();

    } catch (err: any) {
      setError(err.message || 'System network failure during child panel registration routing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro section */}
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between border border-zinc-900 bg-[#070707] p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-600/5 blur-2xl"></div>
        <div className="space-y-2 max-w-2xl">
          <h2 className="font-display text-xl font-black text-white uppercase italic tracking-tight">White-Label Reseller Child Panels</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ready to scale your reselling agency? Buy your own white-label replica of our SMM Panel on your custom domain coordinates. No hosting configurations, cron schedules, or service database maintenance. You sell to your customers at custom profit margins; we handle wholesale backend execution automatically!
          </p>
          <div className="flex bg-zinc-950 border border-zinc-900 p-2.5 rounded-lg text-emerald-400 text-[10px] font-mono select-none w-fit">
            Price: <strong className="text-white ml-1">{formatCurrency(localPrice, currency)} / month</strong> <span className="text-zinc-500 ml-1">({formatCurrency(MONTHLY_PRICE_USD, 'USD')})</span>
          </div>
        </div>

        <div className="flex flex-col items-center bg-blue-950/20 border border-blue-900/30 p-4 rounded-xl leading-none text-center">
          <span className="text-[8px] uppercase font-bold text-zinc-400 tracking-wider">NS COORDINATES FOR DOMAIN</span>
          <span className="font-mono text-[10px] text-blue-400 font-extrabold mt-3 select-all">ns1.mksmmpanel.info</span>
          <span className="font-mono text-[10px] text-blue-400 font-extrabold mt-1 select-all">ns2.mksmmpanel.info</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ordering form block */}
        <div className="lg:col-span-1 border border-zinc-900 bg-zinc-950/45 rounded-xl p-5 relative">
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#71717a] pb-4 border-b border-zinc-900 mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            Order New Network Domain
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Domain target */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#71717a] mb-1.5 flex items-center gap-1.5 leading-none">
                <Globe className="h-3 w-3 text-zinc-500" />
                Target Custom Domain (No http:// or https://)
              </label>
              <input 
                type="text"
                placeholder="e.g., supersmmsellers.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full text-xs font-semibold tracking-wide bg-black/50 border border-zinc-900 focus:border-blue-500 rounded-lg p-2.5 font-sans outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            {/* Admin username details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#71717a] mb-1.5 flex items-center gap-1.5 leading-none">
                  <Key className="h-3 w-3 text-zinc-500" />
                  Admin Username (Root)
                </label>
                <input 
                  type="text"
                  placeholder="admin"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full text-xs font-semibold bg-black/50 border border-zinc-900 focus:border-blue-500 rounded-lg p-2.5 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#71717a] mb-1.5 flex items-center gap-1.5 leading-none">
                  <ShieldCheck className="h-3 w-3 text-zinc-500" />
                  Admin Password
                </label>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full text-xs font-semibold bg-black/50 border border-zinc-900 focus:border-blue-500 rounded-lg p-2.5 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Panel Currency target */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#71717a] mb-1.5 leading-none">
                Default Panel Main Currency
              </label>
              <select
                value={panelCurrency}
                onChange={(e) => setPanelCurrency(e.target.value)}
                className="w-full text-xs font-semibold bg-black/50 border border-zinc-900 focus:border-blue-500 rounded-lg p-2.5 outline-none transition-colors"
              >
                <option value="USD">USD ($)</option>
                <option value="PKR">PKR (₨)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {error && (
              <div className="p-3 border border-red-900/40 bg-red-950/15 text-red-400 text-[10px] leading-relaxed rounded-lg flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 border border-emerald-900/40 bg-emerald-950/15 text-emerald-400 text-[10px] leading-relaxed rounded-lg flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-blue-600 bg-blue-600 text-white hover:bg-blue-550 p-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>DISPATCH PURCHASE ORDER</span>
            </button>

          </form>
        </div>

        {/* List of ordered Child Panels */}
        <div className="lg:col-span-2 border border-zinc-900 bg-zinc-950/45 rounded-xl p-5">
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#71717a] pb-4 border-b border-zinc-900 mb-4 flex items-center justify-between">
            <span>📋 My Child Panel Licenses</span>
            <span className="text-[8.5px] tracking-widest font-extrabold text-zinc-500 block border border-zinc-900 bg-black/50 px-2 py-0.5 rounded">
              AUTO PROVISIONS
            </span>
          </h3>

          {orderedPanels.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Globe className="h-8 w-8 text-zinc-700" />
              <h4 className="text-xs font-bold text-zinc-400">No Child Panels Tracked</h4>
              <p className="text-[10px] text-zinc-650 max-w-xs leading-relaxed mt-1">Configure your DNS target parameters above to trigger SMM replica node integrations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-extrabold uppercase text-[8.5px] pb-2">
                    <th className="pb-2">DOMAIN REGISTRY NAME</th>
                    <th className="pb-2">ADMIN NAME</th>
                    <th className="pb-2 hidden sm:table-cell">CURRENCY</th>
                    <th className="pb-2 hidden sm:table-cell">DATE DISPATCHED</th>
                    <th className="pb-2">PRICE</th>
                    <th className="pb-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {orderedPanels.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 font-mono font-extrabold text-zinc-200 select-all truncate">{p.domain}</td>
                      <td className="py-3.5 text-zinc-400 font-semibold">{p.adminUser}</td>
                      <td className="py-3.5 text-zinc-500 hidden sm:table-cell font-bold">{p.currency}</td>
                      <td className="py-3.5 text-zinc-500 hidden sm:table-cell">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 font-semibold text-zinc-300">
                        {formatCurrency(convertCurrency(p.priceUSD, 'USD', currency), currency)}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="inline-block px-1.5 py-0.5 text-[8px] font-extrabold tracking-widest uppercase rounded border border-orange-500/15 bg-orange-600/10 text-orange-400 animate-pulse">
                          {p.status}
                        </span>
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
  );
}
