import { useReceiptSessionStore } from './receipt-session.store';

describe('useReceiptSessionStore', () => {
  beforeEach(() => {
    useReceiptSessionStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = useReceiptSessionStore.getState();
    expect(state.items).toEqual([]);
    expect(state.participants).toEqual([]);
    expect(state.currency).toBe('UZS');
  });

  it('should set currency and participants correctly', () => {
    const store = useReceiptSessionStore.getState();
    store.setCurrency('USD');
    store.setParticipants([{ uniqueId: 'USER#1', username: 'Alisher' }]);

    const nextState = useReceiptSessionStore.getState();
    expect(nextState.currency).toBe('USD');
    expect(nextState.participants).toHaveLength(1);
    expect(nextState.participants[0].username).toBe('Alisher');
  });

  it('should apply AI split allocations correctly', () => {
    const store = useReceiptSessionStore.getState();
    store.setItems([
      {
        id: 'item-1',
        name: 'Palov',
        unitPrice: 40000,
        quantity: 1,
        totalPrice: 40000,
        splitMode: 'count',
        assignedTo: [],
        perPersonCount: { 'USER#2': 1 },
      },
    ]);

    store.applyAiSplitAllocation([
      {
        itemId: 'item-1',
        assignedTo: ['USER#1', 'USER#2'],
      },
    ]);

    const updatedItem = useReceiptSessionStore.getState().items[0];
    expect(updatedItem.splitMode).toBe('equal');
    expect(updatedItem.assignedTo).toEqual(['USER#1', 'USER#2']);
    expect(updatedItem.perPersonCount).toEqual({});
  });
});
