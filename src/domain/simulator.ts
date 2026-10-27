import type {Campaign,Stock} from './engine';

export interface Scenario {
 changePct:number;
 baselineSpendSar:number;
 illustrativeSpendSar:number;
 illustrativeRevenueSar:number|null;
 illustrativeOrders:number|null;
 currentDaysOfCover:number|null;
 stressedDaysOfCover:number|null;
 stockRunwayRisk:boolean;
 caveat:string;
}
const r=(n:number,precision=2)=>Number(n.toFixed(precision));
/**
 * Transparent sensitivity analysis only. It is NOT a prediction of results
 * and explicitly assumes identical ROAS/conversion at changed spend.
 * Extra paid attributed orders/day are treated as incremental stock consumption
 * only for INCREASED spend, providing an intentionally conservative stress case.
 */
export function simulateSpendChange(c:Campaign,stock:Stock|undefined,observedDays:number,changePct:number):Scenario {
 if(!Number.isFinite(changePct)||changePct < -50||changePct>50)throw Error('Change must be between -50 and +50 percent');
 if(!Number.isFinite(observedDays)||observedDays<1)throw Error('Observed days must be positive');
 const multiplier=1+changePct/100;
 const extraPaidDailyOrders=Math.max(0,changePct/100)*c.unitsSold/observedDays;
 const daily=stock?.avgDailyUnits??0;
 const currentDaysOfCover=stock&&daily>0?r(stock.availableUnits/daily,1):null;
 const stressedDaysOfCover=stock&&daily+extraPaidDailyOrders>0?r(stock.availableUnits/(daily+extraPaidDailyOrders),1):null;
 return {
  changePct,
  baselineSpendSar:c.spendSar,
  illustrativeSpendSar:r(c.spendSar*multiplier),
  illustrativeRevenueSar:c.roas===null?null:r(c.revenueSar*multiplier),
  illustrativeOrders:c.roas===null?null:r(c.orders*multiplier,1),
  currentDaysOfCover,
  stressedDaysOfCover,
  stockRunwayRisk:stock!==undefined&&stressedDaysOfCover!==null&&stressedDaysOfCover<=stock.leadTimeDays,
  caveat:'Constant ROAS and proportional attributed orders are UNVERIFIED assumptions; this is a sensitivity scenario, not a forecast, profit promise, or bidding instruction. Uncertain attribution and organic sales effects are not modeled.'
 };
}
