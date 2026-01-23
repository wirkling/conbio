// Date calculation utilities for contract management

export function calculateRetentionEndDate(
  contractEndDate: string,
  retentionValue: number,
  retentionUnit: 'days' | 'months' | 'years'
): Date {
  const endDate = new Date(contractEndDate);

  switch (retentionUnit) {
    case 'days':
      endDate.setDate(endDate.getDate() + retentionValue);
      break;
    case 'months':
      endDate.setMonth(endDate.getMonth() + retentionValue);
      break;
    case 'years':
      endDate.setFullYear(endDate.getFullYear() + retentionValue);
      break;
  }

  return endDate;
}

export function isRetentionExpiringSoon(
  retentionEndDate: Date,
  daysThreshold = 90
): boolean {
  const today = new Date();
  const daysUntilExpiry = Math.ceil(
    (retentionEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
