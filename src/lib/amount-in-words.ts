/**
 * Convert monetary amount in Indian Rupees to formal Words string.
 * Uses standard Indian numbering system (Lakhs, Crores).
 *
 * Example:
 *   toIndianCurrencyWords(5900) → "Five Thousand Nine Hundred Rupees Only"
 *   toIndianCurrencyWords(123456.50) → "One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees and Fifty Paise Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';

  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }

  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }

  if (n > 0) {
    str += ONES[n] + ' ';
  }

  return str.trim();
}

export function toIndianCurrencyWords(amount: number): string {
  if (amount === 0 || isNaN(amount) || !isFinite(amount)) {
    return 'Zero Rupees Only';
  }

  const positiveAmount = Math.abs(amount);
  const rupees = Math.floor(positiveAmount);
  const paise = Math.round((positiveAmount - rupees) * 100);

  let result = '';

  const crore = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  if (crore > 0) {
    result += convertLessThanThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanThousand(remainder) + ' ';
  }

  result = result.trim() + (rupees === 1 ? ' Rupee' : ' Rupees');

  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }

  result += ' Only';

  return result;
}
