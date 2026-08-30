import { LineDiscountInput, InvoiceDiscountInput } from './invoice.types';
import { rupeesToPaise } from '@/lib/money';
import { DiscountExceedsLineValueError, DiscountExceedsInvoiceValueError, InvalidInvoiceInputError } from './invoice.errors';

export function calculateLineDiscountPaise(grossLinePaise: number, discountInput?: LineDiscountInput, itemName = 'Item'): number {
  if (!discountInput || discountInput.value <= 0) return 0;

  let discountPaise = 0;
  if (discountInput.type === 'PERCENTAGE') {
    if (discountInput.value > 100) {
      throw new InvalidInvoiceInputError(`Percentage discount for '${itemName}' cannot exceed 100%. Received: ${discountInput.value}%`);
    }
    discountPaise = Math.round((grossLinePaise * discountInput.value) / 100);
  } else {
    discountPaise = rupeesToPaise(discountInput.value);
  }

  if (discountPaise > grossLinePaise) {
    throw new DiscountExceedsLineValueError(itemName, discountPaise, grossLinePaise);
  }

  return discountPaise;
}

export function calculateTotalInvoiceDiscountPaise(eligibleBasePaise: number, discountInput?: InvoiceDiscountInput): number {
  if (!discountInput || discountInput.value <= 0 || eligibleBasePaise <= 0) return 0;

  let totalDiscountPaise = 0;
  if (discountInput.type === 'PERCENTAGE') {
    if (discountInput.value > 100) {
      throw new InvalidInvoiceInputError(`Percentage invoice discount cannot exceed 100%. Received: ${discountInput.value}%`);
    }
    totalDiscountPaise = Math.round((eligibleBasePaise * discountInput.value) / 100);
  } else {
    totalDiscountPaise = rupeesToPaise(discountInput.value);
  }

  if (totalDiscountPaise > eligibleBasePaise) {
    throw new DiscountExceedsInvoiceValueError(totalDiscountPaise, eligibleBasePaise);
  }

  return totalDiscountPaise;
}

/**
 * Distributes total invoice discount across eligible net line amounts using the Largest-Remainder Algorithm.
 * Guarantees sum(allocations) === totalInvoiceDiscountPaise with zero paise remainder drift.
 */
export function allocateInvoiceDiscountLargestRemainder(
  netLineAmountsPaise: number[],
  totalInvoiceDiscountPaise: number
): number[] {
  if (totalInvoiceDiscountPaise <= 0 || netLineAmountsPaise.length === 0) {
    return new Array(netLineAmountsPaise.length).fill(0);
  }

  const eligibleSum = netLineAmountsPaise.reduce((acc, curr) => acc + curr, 0);
  if (eligibleSum <= 0) {
    return new Array(netLineAmountsPaise.length).fill(0);
  }

  if (totalInvoiceDiscountPaise > eligibleSum) {
    throw new DiscountExceedsInvoiceValueError(totalInvoiceDiscountPaise, eligibleSum);
  }

  // 1. Calculate exact proportional floating shares & floored integer shares
  const exactShares: number[] = [];
  const flooredShares: number[] = [];
  const remainders: { index: number; remainder: number }[] = [];

  let allocatedSum = 0;

  for (let i = 0; i < netLineAmountsPaise.length; i++) {
    const netLine = netLineAmountsPaise[i];
    if (netLine <= 0) {
      exactShares.push(0);
      flooredShares.push(0);
      remainders.push({ index: i, remainder: 0 });
      continue;
    }

    const exactShare = (netLine * totalInvoiceDiscountPaise) / eligibleSum;
    const flooredShare = Math.floor(exactShare);
    const remainder = exactShare - flooredShare;

    exactShares.push(exactShare);
    flooredShares.push(flooredShare);
    remainders.push({ index: i, remainder });

    allocatedSum += flooredShare;
  }

  // 2. Calculate remaining unallocated paise
  let leftoverPaise = totalInvoiceDiscountPaise - allocatedSum;

  // 3. Sort remainders in descending order. Break ties by original line index ascending.
  remainders.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.index - b.index;
  });

  // 4. Distribute 1 paise to lines with largest remainders until leftover is 0
  const finalAllocations = [...flooredShares];
  let rIndex = 0;
  while (leftoverPaise > 0 && rIndex < remainders.length) {
    const itemIndex = remainders[rIndex].index;
    if (netLineAmountsPaise[itemIndex] > 0) {
      finalAllocations[itemIndex] += 1;
      leftoverPaise -= 1;
    }
    rIndex++;
  }

  return finalAllocations;
}
