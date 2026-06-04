/**
 * Code license: Apache-2.0
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number;
}

export const ALL_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'United States Dollar', symbol: '$', flag: '🇺🇸', rate: 1.0 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', rate: 278.50 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate: 0.92 },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', flag: '🇬🇧', rate: 0.79 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', rate: 3.75 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rate: 83.50 },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ', flag: '🇦🇪', rate: 3.67 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', rate: 0.31 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦', rate: 3.64 },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', flag: '🇴🇲', rate: 0.38 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', flag: '🇧🇭', rate: 0.38 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rate: 1.37 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rate: 1.50 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rate: 156.50 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', rate: 7.25 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', rate: 32.30 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rate: 18.80 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', rate: 89.50 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', rate: 5.25 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', rate: 17.50 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', rate: 1375.0 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', rate: 16250.0 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rate: 1.35 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', rate: 0.90 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', rate: 4.71 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', rate: 36.70 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', rate: 58.50 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', rate: 25450.0 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', rate: 10.50 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', rate: 10.60 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', rate: 6.90 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', rate: 1.63 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', rate: 47.20 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', rate: 1450.0 },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', flag: '🇮🇱', rate: 3.68 },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱', rate: 910.0 },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴', rate: 3860.0 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪', rate: 3.73 },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷', rate: 895.0 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', rate: 3.95 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴', rate: 4.60 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺', rate: 360.0 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', rate: 22.80 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦', rate: 40.20 },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', flag: '🇱🇰', rate: 301.50 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', rate: 117.50 },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵', rate: 133.50 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', rate: 130.0 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭', rate: 14.50 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH', flag: '🇲🇦', rate: 10.05 },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', flag: '🇮🇶', rate: 1310.0 },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', flag: '🇰🇿', rate: 445.0 }
];

export const EXCHANGE_RATES: Record<string, number> = {};
ALL_CURRENCIES.forEach(c => {
  EXCHANGE_RATES[c.code] = c.rate;
});

export const CURRENCY_SYMBOLS: Record<string, string> = {};
ALL_CURRENCIES.forEach(c => {
  CURRENCY_SYMBOLS[c.code] = c.symbol;
});

export function convertCurrency(amount: number, from: string, to: string): number {
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();
  
  const fromRate = EXCHANGE_RATES[fromCode] || 1.0;
  const toRate = EXCHANGE_RATES[toCode] || 1.0;
  
  // Convert from input currency to USD base first, then convert from USD to target currency
  const amountInUSD = amount / fromRate;
  return parseFloat((amountInUSD * toRate).toFixed(4));
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || '$';
  
  // Decimals specification based on PKR/JPY/KRW vs others
  const noDecimals = ['PKR', 'JPY', 'KRW', 'VND', 'IDR', 'IQD'].includes(code);
  const decimals = noDecimals ? 0 : 2;
  
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

