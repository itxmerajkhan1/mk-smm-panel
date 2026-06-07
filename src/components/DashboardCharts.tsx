/**
 * Code license: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, LineChart, Line, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, Layers, Award, Calendar, DollarSign, Download } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface DashboardChartsProps {
  orders: any[];
  transactions: any[];
  services: any[];
  currency: string;
}

// Visual Palette for Apple-inspired charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardCharts({
  orders = [],
  transactions = [],
  services = [],
  currency = 'USD'
}: DashboardChartsProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartType, setChartType] = useState<'revenue' | 'orders' | 'services'>('revenue');

  // Daily report data compiler
  const getTrendData = () => {
    if (timeframe === 'weekly') {
      return [
        { name: 'Week 1', revenue: 450, orders: 154, users: 12, profit: 135 },
        { name: 'Week 2', revenue: 890, orders: 320, users: 24, profit: 267 },
        { name: 'Week 3', revenue: 1280, orders: 485, users: 38, profit: 384 },
        { name: 'Week 4', revenue: 1650, orders: 610, users: 55, profit: 495 },
        { name: 'Week 5', revenue: 2320, orders: 840, users: 78, profit: 696 },
        { name: 'Week 6', revenue: 2980, orders: 1120, users: 104, profit: 894 },
      ];
    }
    if (timeframe === 'monthly') {
      return [
        { name: 'Jan', revenue: 1800, orders: 750, users: 40, profit: 540 },
        { name: 'Feb', revenue: 3100, orders: 1100, users: 82, profit: 930 },
        { name: 'Mar', revenue: 4900, orders: 1950, users: 135, profit: 1470 },
        { name: 'Apr', revenue: 6800, orders: 2470, users: 210, profit: 2040 },
        { name: 'May', revenue: 9500, orders: 3820, users: 315, profit: 2850 },
        { name: 'Jun', revenue: 12800, orders: 5120, users: 450, profit: 3840 },
      ];
    }
    // Default: daily reports
    return [
      { name: 'Mon', revenue: 120, orders: 45, users: 3, profit: 36 },
      { name: 'Tue', revenue: 180, orders: 62, users: 5, profit: 54 },
      { name: 'Wed', revenue: 150, orders: 55, users: 4, profit: 45 },
      { name: 'Thu', revenue: 290, orders: 98, users: 9, profit: 87 },
      { name: 'Fri', revenue: 420, orders: 140, users: 14, profit: 126 },
      { name: 'Sat', stroke: 380, revenue: 380, orders: 115, users: 11, profit: 114 },
      { name: 'Sun', revenue: 510, orders: 160, users: 18, profit: 153 },
    ];
  };

  const chartData = getTrendData();

  // Distribution of social nodes platforms (Instagram, TikTok, YouTube, etc.)
  const serviceDistribution = [
    { name: 'Instagram Flow', value: 42 },
    { name: 'TikTok Push', value: 25 },
    { name: 'YouTube Views', value: 18 },
    { name: 'Facebook Boost', value: 10 },
    { name: 'Telegram Members', value: 5 },
  ];

  // Helper formatting for tooltip
  const customTooltipFormatter = (value: any, name: any) => {
    if (name === 'revenue' || name === 'profit') {
      return [formatCurrency(Number(value), currency), name.toUpperCase()];
    }
    return [value, name.toUpperCase()];
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Time Period,Revenue,Orders,New Users,Profit\r\n";
    chartData.forEach(row => {
      csvContent += `${row.name},${row.revenue},${row.orders},${row.users},${row.profit}\r\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MK_SMM_${timeframe}_intel_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Command Selector Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-950/40 border border-zinc-900/80 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-display text-sm font-black text-white uppercase tracking-tight">Enterprise Visual Analytics</h3>
            <p className="text-[10px] text-zinc-500">Global traffic logs, reseller profits, and metric performance node audits</p>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-zinc-900 border border-zinc-850 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                  timeframe === t 
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/15'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export Ledger button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <Download className="h-3 w-3 text-blue-400" />
            <span>EXPORT CSV reports</span>
          </button>
        </div>
      </div>

      {/* Main split of analytical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Line / Area Charts */}
        <div className="lg:col-span-2 border border-zinc-900 bg-black/60 backdrop-blur-md rounded-2xl p-6 relative">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span className="font-display text-xs font-black uppercase text-zinc-100 tracking-wider">
                Platform Activity & Rate Curves
              </span>
            </div>

            {/* Sub metric charts */}
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('revenue')}
                className={`px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-widest border transition-all rounded-md ${
                  chartType === 'revenue' 
                    ? 'border-blue-500/40 bg-blue-600/10 text-blue-400' 
                    : 'border-zinc-850 hover:border-zinc-700 text-zinc-500 hover:text-white'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setChartType('orders')}
                className={`px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-widest border transition-all rounded-md ${
                  chartType === 'orders' 
                    ? 'border-emerald-500/40 bg-emerald-600/10 text-emerald-400' 
                    : 'border-zinc-850 hover:border-zinc-700 text-zinc-500 hover:text-white'
                }`}
              >
                Orders Count
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 min-h-[256px] w-full font-mono text-[10px]">
            {/* ✅ FIXED: Added key and stable width/height fallback to break loop layout bugs */}
            <ResponsiveContainer width="100%" height="100%" key={chartType + timeframe}>
              {chartType === 'revenue' ? (
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#121214" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#3f3f46" strokeWidth={1} />
                  <YAxis stroke="#3f3f46" strokeWidth={1} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f1f23', borderRadius: '12px' }} 
                    formatter={customTooltipFormatter}
                    labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '15px' }} />
                  {/* ✅ FIXED: Turned off active animation to stop depth update cascade */}
                  <Area type="monotone" name="revenue" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={false} />
                  <Area type="monotone" name="profit" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" isAnimationActive={false} />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#121214" strokeDasharray="3 3"/>
                  <XAxis dataKey="name" stroke="#3f3f46" strokeWidth={1} />
                  <YAxis stroke="#3f3f46" strokeWidth={1} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f1f23', borderRadius: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '15px' }} />
                  {/* ✅ FIXED: Turned off active animation for lines */}
                  <Line type="monotone" name="orders booked" dataKey="orders" stroke="#eab308" strokeWidth={2.5} activeDot={{ r: 6 }} isAnimationActive={false} />
                  <Line type="monotone" name="referred registration" dataKey="users" stroke="#a855f7" strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie distribution analysis side panel */}
        <div className="border border-zinc-900 bg-black/60 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-4 mb-4">
              <Layers className="h-4 w-4 text-emerald-500" />
              <span className="font-display text-xs font-black uppercase text-zinc-100 tracking-wider">
                Category Placement Load
              </span>
            </div>
            
            <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">
              Distribution of SMM task triggers by structural node family networks in total client orders.
            </p>

            <div className="h-44 min-h-[176px] w-full flex items-center justify-center relative font-mono text-[9px]">
              {/* ✅ FIXED: Added stable key framework inside donut element */}
              <ResponsiveContainer width="100%" height="100%" key="pie-analytics">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f1f23', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center stat inside donut chart */}
              <div className="absolute inset-x-0 top-[40%] text-center select-none cursor-default leading-none">
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 block">TOTAL NODES</span>
                <span className="text-sm font-black text-white block mt-0.5">100%</span>
              </div>
            </div>
          </div>

          {/* Captions grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
            {serviceDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 py-1">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <div className="truncate text-zinc-300 font-medium">
                  {item.name} <strong className="text-zinc-500">({item.value}%)</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid summarizing report files */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 border border-zinc-900 bg-zinc-950/20 rounded-xl flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Gross Revenue Margin</span>
            <span className="font-mono text-xs font-black text-blue-400">⚡ 32.4% Avg Profit</span>
          </div>
        </div>

        <div className="p-4 border border-zinc-900 bg-zinc-950/20 rounded-xl flex items-center gap-3">
          <div className="h-9 w-9 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Average Order Execution</span>
            <span className="font-mono text-xs font-black text-emerald-400">⏱️ ~4.2 Minutes</span>
          </div>
        </div>

        <div className="p-4 border border-zinc-900 bg-zinc-950/20 rounded-xl flex items-center gap-3">
          <div className="h-9 w-9 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Uptime Network Node Stability</span>
            <span className="font-mono text-xs font-black text-purple-400">📡 99.98% Telemetry</span>
          </div>
        </div>

        <div className="p-4 border border-zinc-900 bg-zinc-950/20 rounded-xl flex items-center gap-3">
          <div className="h-9 w-9 bg-orange-600/10 border border-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Provider APIs Node Ping</span>
            <span className="font-mono text-xs font-black text-orange-400">⚡ 154ms Average Sync</span>
          </div>
        </div>

      </div>

    </div>
  );
}