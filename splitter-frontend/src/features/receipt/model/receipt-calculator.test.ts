import { buildLocalFinalization } from './receipt-calculator';
import type { CalculatorItem, CalculatorParticipant } from './receipt-calculator';

describe('buildLocalFinalization', () => {
  const participants: CalculatorParticipant[] = [
    { uniqueId: 'USER#1', username: 'Alisher' },
    { uniqueId: 'USER#2', username: 'Bobur' },
    { uniqueId: 'USER#3', username: 'Charos' },
  ];

  it('should split equally among assigned participants', () => {
    const items: CalculatorItem[] = [
      {
        id: 'item-1',
        name: 'Kabob',
        price: 30000,
        quantity: 1,
        assignedTo: ['USER#1', 'USER#2'],
        splitMode: 'equal',
      },
    ];

    const result = buildLocalFinalization(items, participants);

    expect(result.grandTotal).toBe(30000);
    expect(result.totalsMap['USER#1']).toBe(15000);
    expect(result.totalsMap['USER#2']).toBe(15000);
    expect(result.totalsMap['USER#3']).toBe(0);

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations).toContainEqual({
      itemId: 'item-1',
      participantId: 'USER#1',
      shareAmount: 15000,
      shareRatio: 0.5,
    });
  });

  it('should split by count/quantity correctly', () => {
    const items: CalculatorItem[] = [
      {
        id: 'item-2',
        name: 'Coca Cola',
        price: 10000,
        quantity: 3,
        perPersonCount: {
          'USER#1': 2,
          'USER#3': 1,
        },
        splitMode: 'count',
      },
    ];

    const result = buildLocalFinalization(items, participants);

    expect(result.grandTotal).toBe(30000);
    expect(result.totalsMap['USER#1']).toBe(20000);
    expect(result.totalsMap['USER#2']).toBe(0);
    expect(result.totalsMap['USER#3']).toBe(10000);

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations).toContainEqual({
      itemId: 'item-2',
      participantId: 'USER#1',
      shareAmount: 20000,
      shareUnits: 2,
    });
  });

  it('should handle mixed split modes', () => {
    const items: CalculatorItem[] = [
      {
        id: 'item-1',
        name: 'Kabob',
        price: 30000,
        quantity: 1,
        assignedTo: ['USER#1', 'USER#2'],
        splitMode: 'equal',
      },
      {
        id: 'item-2',
        name: 'Coca Cola',
        price: 10000,
        quantity: 3,
        perPersonCount: {
          'USER#1': 2,
          'USER#3': 1,
        },
        splitMode: 'count',
      },
    ];

    const result = buildLocalFinalization(items, participants);

    expect(result.grandTotal).toBe(60000);
    expect(result.totalsMap['USER#1']).toBe(35000); // 15000 + 20000
    expect(result.totalsMap['USER#2']).toBe(15000); // 15000
    expect(result.totalsMap['USER#3']).toBe(10000); // 10000
  });

  it('should skip items with no participants assigned in equal mode', () => {
    const items: CalculatorItem[] = [
      {
        id: 'item-1',
        name: 'Empty Item',
        price: 30000,
        quantity: 1,
        assignedTo: [],
        splitMode: 'equal',
      },
    ];

    const result = buildLocalFinalization(items, participants);

    expect(result.grandTotal).toBe(30000);
    expect(result.totalsMap['USER#1']).toBe(0);
    expect(result.totalsMap['USER#2']).toBe(0);
    expect(result.totalsMap['USER#3']).toBe(0);
    expect(result.allocations).toHaveLength(0);
  });
});
