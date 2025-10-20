// Daily distribution calculator for Amazon payouts
// Distributes settlement bucket amount across remaining days

export interface DailyDistribution {
  date: string;
  available_amount: number;
  cumulative_amount: number;
  days_until_settlement: number;
  is_settlement_day: boolean;
}

export interface SettlementBucket {
  period_start: Date;
  period_end: Date;
  settlement_date: Date;
  eligible_amount: number;
  reserve_amount: number;
  adjustments: number;
  total_draws: number;
}

export function calculateDailyDistributions(
  bucket: SettlementBucket,
  startDate: Date = new Date()
): DailyDistribution[] {
  const distributions: DailyDistribution[] = [];
  
  // Calculate net amount available in bucket
  const netBucketAmount = Math.max(
    0,
    bucket.eligible_amount + bucket.adjustments - bucket.reserve_amount - bucket.total_draws
  );
  
  // Calculate days from today to settlement
  const today = new Date(startDate);
  today.setHours(0, 0, 0, 0);
  
  const settlementDate = new Date(bucket.settlement_date);
  settlementDate.setHours(0, 0, 0, 0);
  
  const daysRemaining = Math.ceil(
    (settlementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysRemaining <= 0) {
    // Settlement is today or past - no distribution needed
    return [{
      date: today.toISOString().split('T')[0],
      available_amount: netBucketAmount,
      cumulative_amount: netBucketAmount,
      days_until_settlement: 0,
      is_settlement_day: true
    }];
  }
  
  // Distribute amount evenly across remaining days
  const dailyIncrement = netBucketAmount / daysRemaining;
  let cumulativeAmount = 0;
  
  for (let i = 0; i < daysRemaining; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + i);
    
    cumulativeAmount += dailyIncrement;
    const isSettlementDay = i === daysRemaining - 1;
    
    distributions.push({
      date: currentDate.toISOString().split('T')[0],
      available_amount: dailyIncrement,
      cumulative_amount: cumulativeAmount,
      days_until_settlement: daysRemaining - i,
      is_settlement_day: isSettlementDay
    });
  }
  
  return distributions;
}

export function redistributeAfterDraw(
  bucket: SettlementBucket,
  drawAmount: number,
  drawDate: Date
): DailyDistribution[] {
  // Update bucket with new draw
  const updatedBucket: SettlementBucket = {
    ...bucket,
    total_draws: bucket.total_draws + drawAmount
  };
  
  // Recalculate distributions from draw date forward
  return calculateDailyDistributions(updatedBucket, drawDate);
}

export function getAvailableToday(
  bucket: SettlementBucket,
  todayDraws: number = 0
): number {
  // Calculate what's available for daily transfer right now
  const eligibleToDate = bucket.eligible_amount;
  const reserveToday = bucket.reserve_amount;
  const drawsToDate = bucket.total_draws + todayDraws;
  const adjustments = bucket.adjustments;
  
  return Math.max(
    0,
    eligibleToDate + adjustments - reserveToday - drawsToDate
  );
}

export function getProjectedSettlement(bucket: SettlementBucket): number {
  // Calculate final settlement amount
  return Math.max(
    0,
    bucket.eligible_amount + bucket.adjustments - bucket.reserve_amount - bucket.total_draws
  );
}
