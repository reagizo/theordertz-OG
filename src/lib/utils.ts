export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString('en-US')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function statusColor(status: string): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-800'
    case 'rejected': return 'bg-red-100 text-red-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function serviceLabel(type: string): string {
  switch (type) {
    case 'cash_send': return 'Cash Send'
    case 'cash_withdrawal': return 'Cash Withdrawal'
    case 'airtime_bundle': return 'Airtime/Bundle'
    case 'tv_subscriptions': return 'TV Subscriptions'
    case 'internet_subscriptions': return 'Internet Subscriptions'
    case 'utility_bills': return 'Utility Bills/Services'
    case 'all_payments': return 'All Payment Bills'
    default: return type
  }
}

export function carrierLabel(carrier: string): string {
  return carrier
}

export function tierLabel(tier: string): string {
  switch (tier) {
    case 'd2d': return 'Day-to-Day'
    case 'premier': return 'Premier'
    default: return tier
  }
}
