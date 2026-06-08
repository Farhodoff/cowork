import { convertItemPrice, getConversionFactor } from './currency';

describe('currency conversion utility', () => {
  it('should calculate correct conversion factors', () => {
    expect(getConversionFactor('USD', 'UZS')).toBe(13000);
    expect(getConversionFactor('UZS', 'USD')).toBeCloseTo(1 / 13000, 8);
  });

  it('should convert and round UZS prices to integers', () => {
    expect(convertItemPrice(2, 'USD', 'UZS')).toBe(26000);
    expect(convertItemPrice(1000, 'UZS', 'UZS')).toBe(1000);
    expect(convertItemPrice(1500, 'JPY', 'UZS')).toBe(127500);
  });

  it('should convert and round other currencies to 2 decimal places', () => {
    expect(convertItemPrice(13000, 'UZS', 'USD')).toBe(1);
    expect(convertItemPrice(19500, 'UZS', 'USD')).toBe(1.5);
    expect(convertItemPrice(19501, 'UZS', 'USD')).toBe(1.5);
    expect(convertItemPrice(19565, 'UZS', 'USD')).toBe(1.51);
  });

  it('should convert correctly between foreign currencies', () => {
    expect(convertItemPrice(100, 'USD', 'EUR')).toBe(92.86);
  });
});
