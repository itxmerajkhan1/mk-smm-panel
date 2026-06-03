/**
 * Code license: Apache-2.0
 */

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  PKR: 278.50,
  EUR: 0.92,
  GBP: 0.79
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  PKR: '₨ ',
  EUR: '€',
  GBP: '£'
};

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
  
  // Decimals specification based on PKR vs others
  const decimals = code === 'PKR' ? 0 : 2;
  
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}
