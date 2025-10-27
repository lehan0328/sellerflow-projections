// Daily cumulative distribution calculator for Amazon payouts
// Uses Amazon's BeginningBalance and distributes across settlement period

export interface DailyDistribution {
  date: string;
  daily_unlock: number;
  cumulative_available: number;
  days_accumulated: number;
}

export interface VolumeWeight {
  transaction_date: string;
  net_amount: number;
}

export function generateCumulativeDailyDistribution(
  settlementStartDate: Date,
  settlementEndDate: Date,
  totalCumulativeAmount: number, // From Amazon BeginningBalance
  alreadyDrawn: number,
  volumeWeights?: VolumeWeight[]
): DailyDistribution[] {
  const distributions: DailyDistribution[] = [];
  
  // Calculate net available after draws
  const netAvailable = Math.max(0, totalCumulativeAmount - alreadyDrawn);
  
  if (netAvailable <= 0) {
    console.log('[DAILY-DIST] No funds available after draws');
    return [];
  }
  
  // Calculate number of days in settlement period
  const startDate = new Date(settlementStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(settlementEndDate);
  endDate.setHours(0, 0, 0, 0);
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  if (totalDays <= 0) {
    console.log('[DAILY-DIST] Invalid date range');
    return [];
  }
  
  console.log(`[DAILY-DIST] Generating distribution for ${totalDays} days, total: $${netAvailable}`);
  
  // Create volume weights map
  const volumeWeightMap = new Map<string, number>();
  let totalVolume = 0;
  
  if (volumeWeights && volumeWeights.length > 0) {
    volumeWeights.forEach(vw => {
      const dateKey = vw.transaction_date;
      const amount = Math.abs(vw.net_amount);
      volumeWeightMap.set(dateKey, amount);
      totalVolume += amount;
    });
    console.log(`[DAILY-DIST] Using volume weights from ${volumeWeights.length} days, total volume: $${totalVolume}`);
  }
  
  // Generate daily distributions
  let cumulativeAmount = 0;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Calculate daily unlock amount
    let dailyUnlock: number;
    
    if (totalVolume > 0 && volumeWeightMap.has(dateStr)) {
      // Volume-weighted distribution
      const dayVolume = volumeWeightMap.get(dateStr) || 0;
      const weight = dayVolume / totalVolume;
      dailyUnlock = netAvailable * weight;
    } else {
      // Even distribution if no volume data
      dailyUnlock = netAvailable / totalDays;
    }
    
    cumulativeAmount += dailyUnlock;
    
    distributions.push({
      date: dateStr,
      daily_unlock: Math.round(dailyUnlock * 100) / 100, // Round to cents
      cumulative_available: Math.round(cumulativeAmount * 100) / 100,
      days_accumulated: i + 1
    });
  }
  
  // Adjust last day to ensure total equals netAvailable exactly
  if (distributions.length > 0) {
    const lastDist = distributions[distributions.length - 1];
    const difference = netAvailable - lastDist.cumulative_available;
    if (Math.abs(difference) > 0.01) {
      lastDist.daily_unlock += difference;
      lastDist.cumulative_available = netAvailable;
      console.log(`[DAILY-DIST] Adjusted last day by $${difference} to match total`);
    }
  }
  
  console.log(`[DAILY-DIST] Generated ${distributions.length} daily distributions`);
  console.log(`[DAILY-DIST] First day: ${distributions[0]?.date} - $${distributions[0]?.daily_unlock}`);
  console.log(`[DAILY-DIST] Last day: ${distributions[distributions.length - 1]?.date} - $${distributions[distributions.length - 1]?.cumulative_available}`);
  
  return distributions;
}

export function recalculateAfterDraw(
  originalDistributions: DailyDistribution[],
  drawAmount: number,
  drawDate: string
): DailyDistribution[] {
  // Find the draw date index
  const drawIndex = originalDistributions.findIndex(d => d.date === drawDate);
  
  if (drawIndex === -1) {
    console.error('[DAILY-DIST] Draw date not found in distributions');
    return originalDistributions;
  }
  
  // Recalculate from draw date onwards
  const updatedDistributions: DailyDistribution[] = [];
  
  // Keep days before draw as-is (they're in the past)
  for (let i = 0; i < drawIndex; i++) {
    updatedDistributions.push(originalDistributions[i]);
  }
  
  // Subtract draw amount from future cumulative amounts
  for (let i = drawIndex; i < originalDistributions.length; i++) {
    const original = originalDistributions[i];
    updatedDistributions.push({
      ...original,
      cumulative_available: Math.max(0, original.cumulative_available - drawAmount)
    });
  }
  
  console.log(`[DAILY-DIST] Recalculated after $${drawAmount} draw on ${drawDate}`);
  
  return updatedDistributions;
}
