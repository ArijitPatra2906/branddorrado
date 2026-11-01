export const formatPrice = (minor, currency) => minor == null ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
export const PERIOD = { one_time: 'one-time', monthly: 'per month', quarterly: 'per quarter', yearly: 'per year' };
export const formatDate = (iso) => iso ? new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso)) : '';
