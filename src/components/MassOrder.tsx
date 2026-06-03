/**
 * Code license: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, AlertCircle, CheckCircle2, Play, RefreshCw, Send, Sparkles, Server } from 'lucide-react';
import { formatCurrency, convertCurrency } from '../utils/currency';

interface MassOrderProps {
  user: any;
  token: string;
  services: any[];
  currency: string;
  onRefreshUser: () => void;
}

interface MassResult {
  line: number;
  raw: string;
  status: 'success' | 'failed';
  message: string;
  orderId?: string;
  chargeUSD?: number;
}

export default function MassOrder({
  user,
  token,
  services = [],
  currency = 'USD',
  onRefreshUser
}: MassOrderProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MassResult[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const handleProcessOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setResults([]);
    setSuccessCount(0);
    setFailCount(0);

    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedResults: MassResult[] = [];
    let activeUserBalanceUSD = user.balance;

    let localSuccess = 0;
    let localFail = 0;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      // Format parser: serviceId|quantity|link
      const parts = rawLine.split('|').map(p => p.trim());
      
      if (parts.length < 3) {
        parsedResults.push({
          line: i + 1,
          raw: rawLine,
          status: 'failed',
          message: 'Invalid coordinate delimiter. Required: service_id|quantity|target_link'
        });
        localFail++;
        continue;
      }

      const [svcId, qtyStr, link] = parts;
      const qty = parseInt(qtyStr, 10);
      const targetService = services.find(s => s.id === svcId);

      // Validation check
      if (!targetService) {
        parsedResults.push({
          line: i + 1,
          raw: rawLine,
          status: 'failed',
          message: `Service ID "${svcId}" does not represent an active catalog provider entry.`
        });
        localFail++;
        continue;
      }

      if (isNaN(qty) || qty < targetService.minQuantity || qty > targetService.maxQuantity) {
        parsedResults.push({
          line: i + 1,
          raw: rawLine,
          status: 'failed',
          message: `Quantity "${qtyStr}" falls outside service thresholds (Min: ${targetService.minQuantity}, Max: ${targetService.maxQuantity}).`
        });
        localFail++;
        continue;
      }

      const chargeUSD = parseFloat(((qty / 1000) * targetService.rate).toFixed(4));
      
      if (activeUserBalanceUSD < chargeUSD) {
        parsedResults.push({
          line: i + 1,
          raw: rawLine,
          status: 'failed',
          message: `Insufficient SMM Balance. Charge: ${formatCurrency(convertCurrency(chargeUSD, 'USD', currency), currency)} (${formatCurrency(chargeUSD, 'USD')}). Balance: ${formatCurrency(convertCurrency(activeUserBalanceUSD, 'USD', currency), currency)}.`
        });
        localFail++;
        continue;
      }

      // Hit backend API to book this specific order item!
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            serviceId: svcId,
            link: link,
            quantity: qty
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'API block rejects booking charge state.');
        }

        const data = await response.json();
        
        parsedResults.push({
          line: i + 1,
          raw: rawLine,
          status: 'success',
          message: `Successfully chartered. Order reference logged.`,
          orderId: data.orderId || data.id,
          chargeUSD
        });
        activeUserBalanceUSD = parseFloat((activeUserBalanceUSD - chargeUSD).toFixed(4));
        localSuccess++;

      } catch (err: any) {
        parsedResults.push({
          line: i + 1,
          raw: rawLine,
          status: 'failed',
          message: err.message || 'Server connection socket timed out.'
        });
        localFail++;
      }
    }

    setResults(parsedResults);
    setSuccessCount(localSuccess);
    setFailCount(localFail);
    onRefreshUser();
    setInputText('');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Intro block banner */}
      <div className="flex flex-col md:flex-row p-6 border border-zinc-900 bg-[#070707] rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-600/5 blur-2xl"></div>
        <div className="space-y-1.5 flex-1">
          <h2 className="font-display text-xl font-black text-white uppercase italic tracking-tight">Enterprise SMM Mass Compiler</h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Charter bulk client tasks simultaneously using our system pipe-delimited compiler. Simply paste one coordinate per line inside the terminal box, check rates, and compile. Our server will process each record, allocating resources and debiting funds in live sequences.
          </p>
          <div className="font-mono text-[9px] text-zinc-500 py-2 inline-block">
            Required Syntax Format: <code className="text-blue-400 font-extrabold select-all bg-black px-1.5 py-0.5 rounded border border-zinc-900">service_id | quantity | target_link</code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bulk Input card */}
        <div className="border border-zinc-900 bg-zinc-950/45 rounded-xl p-5">
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#71717a] pb-4 border-b border-zinc-900 mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            Paste SMM Coordinates Console
          </h3>

          <form onSubmit={handleProcessOrders} className="space-y-4">
            <div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="101_s_views|5000|http://youtube.com/watch?v=abc&#10;105_s_subs|1000|http://youtube.com/c/mychannel"
                rows={8}
                className="w-full font-mono text-xs text-zinc-350 bg-black/60 border border-zinc-900 focus:border-blue-500 rounded-lg p-3 outline-none focus:ring-1 focus:ring-blue-500 transition-colors placeholder:opacity-50"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-550 border border-blue-600 text-white p-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />}
              <span>COMPILE ACTIVE LEDGER ({inputText.split('\n').filter(Boolean).length} LINES)</span>
            </button>
          </form>
        </div>

        {/* Compile results output console */}
        <div className="lg:col-span-2 border border-zinc-900 bg-zinc-950/20 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-4">
              <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#71717a] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                Live Execution Logs
              </h3>

              {/* Status Pills */}
              <div className="flex gap-2 text-[9px] font-mono leading-none">
                <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-2 py-1 rounded font-black uppercase">
                  ✓ {successCount} Success
                </span>
                <span className="bg-red-950/30 text-red-400 border border-red-900/40 px-2 py-1 rounded font-black uppercase">
                  ✗ {failCount} Failures
                </span>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                <Layers className="h-8 w-8 text-zinc-700" />
                <h4 className="text-xs font-bold text-zinc-400">Compiler Awaiting Feed</h4>
                <p className="text-[10px] text-zinc-650 max-w-xs leading-relaxed mt-1">Submit your pipe-linked services dataset in the console to parse and buy.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 font-mono text-[10px]">
                {results.map((r, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-xl flex items-start gap-3 transition-colors ${
                      r.status === 'success' 
                        ? 'border-emerald-900/25 bg-emerald-950/5 text-emerald-400'
                        : 'border-red-900/25 bg-red-950/5 text-red-400'
                    }`}
                  >
                    <span className="font-extrabold text-zinc-500 bg-black/40 px-1.5 py-0.5 rounded border border-zinc-900">Line {r.line}</span>
                    <div className="flex-1 space-y-1">
                      <div className="truncate text-zinc-400 text-[9px]">Raw feed: <code className="text-white bg-black/40 px-1 py-0.5 rounded">{r.raw}</code></div>
                      <div className="font-semibold text-zinc-300">{r.message}</div>
                      {r.orderId && <div className="text-[8.5px] text-emerald-500 uppercase font-black">Logged ID: {r.id || r.orderId}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="border-t border-zinc-900 pt-4 mt-4 text-[9px] text-zinc-500 leading-relaxed font-mono">
              ★ Compiled successfully. Your user balance has been corrected directly against SMM orders logged with wholesale API networks.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
