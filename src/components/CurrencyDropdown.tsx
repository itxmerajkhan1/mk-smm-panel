import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ALL_CURRENCIES, CurrencyInfo } from '../utils/currency';
import { Search, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CurrencyDropdownProps {
  selectedCode: string;
  onChange: (code: string) => void;
  align?: 'left' | 'right';
}

export default function CurrencyDropdown({ selectedCode, onChange, align = 'right' }: CurrencyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCurrency = useMemo(() => {
    return ALL_CURRENCIES.find(c => c.code === selectedCode) || ALL_CURRENCIES[0];
  }, [selectedCode]);

  const filteredCurrencies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ALL_CURRENCIES;
    return ALL_CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(query) || 
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    onChange(code);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-900 focus:outline-none focus:border-zinc-700 cursor-pointer select-none"
      >
        <span className="text-[15px]" role="img" aria-label={selectedCurrency.name}>
          {selectedCurrency.flag}
        </span>
        <span className="font-mono text-xs">{selectedCurrency.code}</span>
        <span className="text-zinc-500 font-normal">({selectedCurrency.symbol})</span>
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute mt-2 w-80 max-h-96 rounded-xl border border-zinc-800 bg-[#060608]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 flex flex-col ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {/* Search Input Container */}
            <div className="p-3 border-b border-zinc-900 bg-black/40 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-zinc-550 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search country or currency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-zinc-550 outline-none font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-zinc-550 hover:text-white px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-900 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List items scroll area */}
            <div className="overflow-y-auto max-h-64 divide-y divide-zinc-950">
              {filteredCurrencies.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  <Globe className="h-5 w-5 mx-auto mb-2 text-zinc-700" />
                  No matching currencies
                </div>
              ) : (
                filteredCurrencies.map((curr) => {
                  const isSelected = curr.code === selectedCode;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => handleSelect(curr.code)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600/10 text-white' 
                          : 'hover:bg-zinc-900/60 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg" role="img" aria-label={curr.name}>
                          {curr.flag}
                        </span>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-white">{curr.code}</span>
                            <span className="text-zinc-500 font-medium">({curr.symbol})</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">{curr.name}</div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <span className="text-[10px] font-black text-blue-400 bg-blue-950/40 border border-blue-900 px-1.5 py-0.5 rounded">
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Micro banner helper */}
            <div className="p-2 bg-black border-t border-zinc-900 text-center text-[9px] text-zinc-550 font-mono">
              Base exchange rate scaled relative to USD node
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
