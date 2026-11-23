type Schedule = { amount: number; frequency: string; isActive: boolean };

/** Annualized monthly average, not a forecast of the number of charges in a particular month. */
export function monthlyGivingEstimate(schedules: readonly Schedule[]): number {
  const total = schedules.filter(schedule => schedule.isActive).reduce((sum, schedule) => {
    const months = schedule.frequency === "weekly" ? 52 / 12 : schedule.frequency === "quarterly" ? 1 / 3 : schedule.frequency === "monthly" ? 1 : 0;
    return sum + schedule.amount * months;
  }, 0);
  return Math.round(total);
}
