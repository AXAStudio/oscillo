// Formatting utilities (hardened)

// Coerce anything -> finite number, stripping commas/spaces in strings.
const toNum = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'bigint') return Number(v);
  if (v == null) return fallback;
  const n = Number(String(v).replace(/[, ]/g, '')); // <-- key: handle "1,234.56"
  return Number.isFinite(n) ? n : fallback;
};

export const formatCurrency = (value: unknown) => {
  const n = toNum(value, 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

// Accept unknown; coerce via toNum so strings/nulls are fine.
export const formatNumber = (value: unknown, decimals = 2): string => {
  const n = toNum(value, 0);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

export const formatPercent = (value: unknown) => {
  // value is already a percentage (e.g., 5.3 = 5.3%)
  const n = toNum(value, 0);
  return `${n.toFixed(2)}%`;
};

// Use the same coercion here for consistency
export const formatAllocation = (v: unknown, dp = 1): string => {
  return `${toNum(v, 0).toFixed(dp)}%`;
};

export const formatCompactNumber = (value: unknown): string => {
  const n = toNum(value, 0);
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(n);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
};
