// src/shared/lib/utils/currency.ts
export const CURRENCY_RATES: Record<string, number> = {
  UZS: 1,
  USD: 13000,
  EUR: 14000,
  RUB: 150,
  JPY: 85,
};

export function getConversionFactor(from: string, to: string): number {
  const fromRate = CURRENCY_RATES[from] || 1;
  const toRate = CURRENCY_RATES[to] || 1;
  return fromRate / toRate;
}

export function convertItemPrice(
  price: number,
  from: string,
  to: string
): number {
  const factor = getConversionFactor(from, to);
  const converted = price * factor;
  if (to === 'UZS') {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100; // 2 decimal places for non-UZS
}
