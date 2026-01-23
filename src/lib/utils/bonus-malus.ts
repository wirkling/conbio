// Bonus/Malus calculation utilities

import { Milestone } from '@/types/database';

export interface StandardBonusMalus {
  type: 'standard';
  early_bonus_percent: number; // e.g., 5
  early_threshold_weeks: number; // e.g., 2 (bonus if 2+ weeks early)
  late_penalty_percent: number; // e.g., 10
  penalty_per_period: 'month' | 'week' | 'day'; // "10% per month"
  max_penalty_percent: number; // e.g., 20
}

export interface BonusMalusResult {
  type: 'bonus' | 'penalty' | 'none';
  amount: number;
  percentage: number;
  description: string;
}

export function calculateBonusMalus(
  milestone: Milestone,
  bonusMalus: StandardBonusMalus
): BonusMalusResult {
  if (!milestone.completed_date || !milestone.current_due_date) {
    return {
      type: 'none',
      amount: 0,
      percentage: 0,
      description: 'Not completed',
    };
  }

  const completedDate = new Date(milestone.completed_date);
  const dueDate = new Date(milestone.current_due_date);
  const milestoneValue = milestone.current_value || 0;

  // Calculate difference in days
  const diffTime = dueDate.getTime() - completedDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Early delivery bonus
  if (diffDays >= bonusMalus.early_threshold_weeks * 7) {
    const bonusAmount = milestoneValue * (bonusMalus.early_bonus_percent / 100);
    return {
      type: 'bonus',
      amount: bonusAmount,
      percentage: bonusMalus.early_bonus_percent,
      description: `Delivered ${Math.floor(diffDays / 7)} weeks early`,
    };
  }

  // Late delivery penalty
  if (diffDays < 0) {
    const lateDays = Math.abs(diffDays);
    let periods = 0;

    switch (bonusMalus.penalty_per_period) {
      case 'day':
        periods = lateDays;
        break;
      case 'week':
        periods = Math.ceil(lateDays / 7);
        break;
      case 'month':
        periods = Math.ceil(lateDays / 30);
        break;
    }

    const uncappedPenaltyPercent = bonusMalus.late_penalty_percent * periods;
    const cappedPenaltyPercent = Math.min(
      uncappedPenaltyPercent,
      bonusMalus.max_penalty_percent
    );
    const penaltyAmount = milestoneValue * (cappedPenaltyPercent / 100);

    return {
      type: 'penalty',
      amount: penaltyAmount,
      percentage: cappedPenaltyPercent,
      description: `${periods} ${bonusMalus.penalty_per_period}(s) late${
        uncappedPenaltyPercent > bonusMalus.max_penalty_percent ? ' (capped)' : ''
      }`,
    };
  }

  return { type: 'none', amount: 0, percentage: 0, description: 'On time' };
}
