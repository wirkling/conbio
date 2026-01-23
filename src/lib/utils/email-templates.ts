// Email template generation utilities

import { Contract, Milestone } from '@/types/database';

function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function generateInflationEmail(
  contract: Contract,
  milestones: Milestone[],
  inflationRate: number,
  year: number
): string {
  const totalIncrease = milestones.reduce((sum, m) => {
    const current = m.current_value || 0;
    const increase = current * (inflationRate / 100);
    return sum + increase;
  }, 0);

  return `Subject: Contract Inflation Adjustment - ${contract.title}

Dear ${contract.vendor_name || 'Partner'},

As per the inflation clause in our contract (${contract.contract_number}), we are applying the ${inflationRate}% inflation adjustment for ${year}.

Contract Details:
- Contract: ${contract.title}
- Contract Number: ${contract.contract_number}
- Inflation Rate Type: ${contract.inflation_clause?.rate_type || 'N/A'}
- Applied Rate: ${inflationRate}%

Milestone Value Adjustments:

${milestones
  .map((m, i) => {
    const current = m.current_value || 0;
    const newValue = current * (1 + inflationRate / 100);
    const increase = newValue - current;

    return `${i + 1}. ${m.name}
   Current Value: ${formatCurrency(current, contract.currency)}
   New Value: ${formatCurrency(newValue, contract.currency)}
   Increase: +${formatCurrency(increase, contract.currency)}`;
  })
  .join('\n\n')}

Total Contract Value Adjustment: +${formatCurrency(totalIncrease, contract.currency)}

New Total Contract Value: ${formatCurrency((contract.current_value || 0) + totalIncrease, contract.currency)}

This change order (CO-INF-${year}) will be effective from ${new Date().toLocaleDateString('de-DE')}.

Best regards,
${contract.client_name || 'Contract Management Team'}`;
}
