import type {
    FinalizeTotalsByItem,
    FinalizeTotalsByParticipant,
    ReceiptAllocation,
} from '@/features/receipt/api/receipt.api';

// Reusing existing types from items-split if possible, or defining new ones.
// To avoid circular deps with component, we define necessary interfaces here or reuse API types.

export type SplitMode = 'equal' | 'count';

export interface CalculatorItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    assignedTo?: string[];
    perPersonCount?: Record<string, number>;
    splitMode?: string; // We'll normalize this
    totalPrice?: number;
}

export interface CalculatorParticipant {
    uniqueId: string;
    username: string;
}

export type CalculationResult = {
    totalsMap: Record<string, number>;
    totalsByParticipant: FinalizeTotalsByParticipant[];
    totalsByItem: FinalizeTotalsByItem[];
    allocations: ReceiptAllocation[];
    grandTotal: number;
};

const ensureMode = (item: CalculatorItem): SplitMode =>
    (item.splitMode === 'count' || (item.splitMode === undefined && item.quantity > 1))
        ? 'count'
        : 'equal';

const computeItemTotal = (item: CalculatorItem) =>
    typeof item.totalPrice === 'number' ? item.totalPrice : item.price * item.quantity;

export const buildLocalFinalization = (
    items: CalculatorItem[],
    participants: CalculatorParticipant[]
): CalculationResult => {
    const totalsByItem: FinalizeTotalsByItem[] = [];
    const allocations: ReceiptAllocation[] = [];

    const participantTotals = participants.reduce<Record<string, number>>((acc, participant) => {
        acc[participant.uniqueId] = 0;
        return acc;
    }, {});

    for (const item of items) {
        const total = computeItemTotal(item);
        totalsByItem.push({ itemId: item.id, name: item.name, total });

        const mode = ensureMode(item);

        if (mode === 'count') {
            const perPersonCount = item.perPersonCount ?? {};
            for (const [uid, rawCount] of Object.entries(perPersonCount)) {
                const count = Number(rawCount);
                if (!uid || Number.isNaN(count) || count <= 0) continue;

                const shareAmount = count * item.price;
                if (!(uid in participantTotals)) {
                    participantTotals[uid] = 0;
                }
                participantTotals[uid] = (participantTotals[uid] ?? 0) + shareAmount;

                allocations.push({
                    itemId: item.id,
                    participantId: uid,
                    shareAmount,
                    shareUnits: count,
                });
            }

            continue;
        }

        // Equal mode
        const assigned = (item.assignedTo ?? []).filter(Boolean);
        const shareCount = assigned.length;
        if (shareCount === 0) {
            console.warn(`Item ${item.id} (${item.name}) has equal split mode but no assigned participants`);
            continue;
        }

        const shareAmount = total / shareCount;
        const shareRatio = 1 / shareCount;

        assigned.forEach((uid) => {
            if (!(uid in participantTotals)) {
                participantTotals[uid] = 0;
            }
            participantTotals[uid] = (participantTotals[uid] ?? 0) + shareAmount;

            allocations.push({
                itemId: item.id,
                participantId: uid,
                shareAmount,
                shareRatio,
            });
        });
    }

    const totalsByParticipant: FinalizeTotalsByParticipant[] = participants.map((participant) => ({
        uniqueId: participant.uniqueId,
        username: participant.username,
        amountOwed: participantTotals[participant.uniqueId] ?? 0,
    }));

    const grandTotal = totalsByItem.reduce((acc, entry) => acc + entry.total, 0);

    return {
        totalsMap: participantTotals,
        totalsByParticipant,
        totalsByItem,
        allocations,
        grandTotal,
    };
};
