// Milestone adjustment utilities
// Automatically calculate and store bonus/malus adjustments

import { Milestone, StandardBonusMalus } from '@/types/database';
import { calculateBonusMalus } from './bonus-malus';

export interface MilestoneAdjustmentUpdate {
  adjustment_type: 'bonus' | 'penalty' | null;
  adjustment_amount: number | null;
  adjustment_percentage: number | null;
  adjustment_reason: string | null;
  adjustment_calculated_at: string;
}

/**
 * Calculate and prepare bonus/malus adjustment for a completed milestone
 *
 * @param milestone - The milestone that was completed
 * @param bonusMalusTerms - The contract's bonus/malus terms
 * @returns Update object to apply to milestone, or null if no adjustment
 */
export function calculateMilestoneAdjustment(
  milestone: Milestone,
  bonusMalusTerms: StandardBonusMalus
): MilestoneAdjustmentUpdate | null {
  // Only calculate if milestone is completed
  if (milestone.status !== 'completed' || !milestone.completed_date) {
    return null;
  }

  // Calculate the bonus/malus
  const result = calculateBonusMalus(milestone, bonusMalusTerms);

  // No adjustment needed
  if (result.type === 'none') {
    return {
      adjustment_type: null,
      adjustment_amount: null,
      adjustment_percentage: null,
      adjustment_reason: null,
      adjustment_calculated_at: new Date().toISOString(),
    };
  }

  // Prepare the adjustment
  const adjustmentAmount = result.type === 'bonus' ? result.amount : -result.amount;

  return {
    adjustment_type: result.type,
    adjustment_amount: adjustmentAmount,
    adjustment_percentage: result.percentage,
    adjustment_reason: result.description,
    adjustment_calculated_at: new Date().toISOString(),
  };
}

/**
 * Get the final invoice amount for a milestone (base + adjustment)
 */
export function getInvoiceAmount(milestone: Milestone): number {
  const baseValue = milestone.current_value || 0;
  const adjustment = milestone.adjustment_amount || 0;
  return baseValue + adjustment;
}

/**
 * Example usage for updating a milestone when marked complete:
 *
 * ```typescript
 * const adjustment = calculateMilestoneAdjustment(milestone, contract.bonus_malus_terms);
 *
 * if (adjustment) {
 *   await supabase
 *     .from('milestones')
 *     .update({
 *       status: 'completed',
 *       completed_date: new Date().toISOString(),
 *       ...adjustment
 *     })
 *     .eq('id', milestone.id);
 *
 *   // Create audit log entry
 *   await supabase.from('audit_log').insert({
 *     entity_type: 'milestone',
 *     entity_id: milestone.id,
 *     action: 'complete',
 *     change_summary: `Milestone completed with ${adjustment.adjustment_type}: ${formatCurrency(Math.abs(adjustment.adjustment_amount))}`,
 *     user_id: userId,
 *     user_name: userName,
 *     metadata: {
 *       milestone_number: milestone.milestone_number,
 *       adjustment_reason: adjustment.adjustment_reason
 *     }
 *   });
 * }
 * ```
 */
