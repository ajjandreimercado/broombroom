const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const SCALES = ['', 'THOUSAND', 'MILLION', 'BILLION'];

const hundreds = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : '');
  return [h ? `${ONES[h]} HUNDRED` : '', rest].filter(Boolean).join(' ');
};

// "AMOUNT IN WORDS" as Philippine receipts write it: ONE THOUSAND PESOS AND 50/100 ONLY.
export const pesoWords = (amount: number) => {
  const totalCents = Math.round(amount * 100);
  const cents = totalCents % 100;
  let whole = Math.floor(totalCents / 100);
  const pesos = whole;
  const parts: string[] = [];
  for (let i = 0; whole > 0; i++, whole = Math.floor(whole / 1000)) {
    const chunk = whole % 1000;
    if (chunk) parts.unshift(hundreds(chunk) + (SCALES[i] ? ` ${SCALES[i]}` : ''));
  }
  const words = parts.join(' ') || 'ZERO';
  return `${words} PESO${pesos === 1 ? '' : 'S'}${cents ? ` AND ${String(cents).padStart(2, '0')}/100` : ''} ONLY`;
};
