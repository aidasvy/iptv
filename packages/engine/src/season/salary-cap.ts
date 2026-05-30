// NBA-style salary cap system with luxury tax and cap exceptions

export interface CapSheet {
  salaryCap: number;       // hard cap (e.g. $136M)
  luxuryTaxLine: number;   // tax threshold (e.g. $165M)
  totalSalary: number;
  capSpace: number;        // max signable
  isOverCap: boolean;
  isOverTax: boolean;
  luxuryTaxBill: number;
  exceptions: CapException[];
}

export type CapException =
  | { type: "MID_LEVEL"; amount: number }         // ~$12.4M
  | { type: "BI_ANNUAL"; amount: number }          // ~$4.5M
  | { type: "MINIMUM"; amount: number }            // veteran minimum
  | { type: "TRADE"; amount: number }              // incoming trade match
  | { type: "ROOM"; amount: number };              // room exception if under cap

export function computeCapSheet(
  playerSalaries: number[],
  salaryCap: number,
  luxuryTaxLine: number
): CapSheet {
  const totalSalary = playerSalaries.reduce((a, b) => a + b, 0);
  const isOverCap = totalSalary > salaryCap;
  const isOverTax = totalSalary > luxuryTaxLine;
  const capSpace = isOverCap ? 0 : salaryCap - totalSalary;

  const exceptions: CapException[] = [];

  if (!isOverCap) {
    exceptions.push({ type: "ROOM", amount: capSpace });
  } else {
    // Over-cap teams get mid-level and bi-annual
    exceptions.push({ type: "MID_LEVEL", amount: 12400 });
    if (!isOverTax) {
      exceptions.push({ type: "BI_ANNUAL", amount: 4500 });
    }
  }
  exceptions.push({ type: "MINIMUM", amount: 1119 });

  return {
    salaryCap,
    luxuryTaxLine,
    totalSalary,
    capSpace,
    isOverCap,
    isOverTax,
    luxuryTaxBill: computeLuxuryTax(totalSalary, luxuryTaxLine),
    exceptions,
  };
}

// NBA apron/tax brackets — progressive per dollar over threshold
function computeLuxuryTax(totalSalary: number, taxLine: number): number {
  if (totalSalary <= taxLine) return 0;

  const overage = totalSalary - taxLine;
  const brackets = [
    { upTo: 4999, rate: 1.5 },
    { upTo: 9999, rate: 1.75 },
    { upTo: 14999, rate: 2.5 },
    { upTo: 19999, rate: 3.25 },
    { upTo: Infinity, rate: 3.75 }, // repeater rate would be higher
  ];

  let tax = 0;
  let remaining = overage;
  let prev = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const rangeSize = bracket.upTo === Infinity ? remaining : Math.min(bracket.upTo - prev + 1, remaining);
    tax += rangeSize * bracket.rate;
    remaining -= rangeSize;
    prev = bracket.upTo + 1;
  }

  return Math.round(tax);
}

// Max contract calculation based on years of service
export function maxContractAmount(
  yearsOfService: number,
  salaryCap: number
): { salary: number; pct: number } {
  // 0-6 years: 25%, 7-9 years: 30%, 10+ years: 35%
  const pct = yearsOfService < 7 ? 0.25 : yearsOfService < 10 ? 0.30 : 0.35;
  return { salary: Math.round(salaryCap * pct), pct };
}

// Validate a trade for cap compliance
export interface TradeValidation {
  isValid: boolean;
  reason?: string;
  capDelta: number;
}

export function validateTrade(
  teamSalary: number,
  outgoingSalary: number,
  incomingSalary: number,
  salaryCap: number,
  isOverCap: boolean
): TradeValidation {
  const newSalary = teamSalary - outgoingSalary + incomingSalary;
  const capDelta = incomingSalary - outgoingSalary;

  if (!isOverCap) {
    // Under cap: can take back up to cap room + outgoing
    const maxIncoming = salaryCap - teamSalary + outgoingSalary;
    if (incomingSalary > maxIncoming) {
      return { isValid: false, reason: `Incoming salary exceeds available cap room. Max: $${maxIncoming.toLocaleString()}K`, capDelta };
    }
  } else {
    // Over cap: 125% matching rule (+ $100K)
    const matchingLimit = Math.floor(outgoingSalary * 1.25) + 100;
    if (incomingSalary > matchingLimit) {
      return { isValid: false, reason: `Trade doesn't match salary rules. Max incoming: $${matchingLimit.toLocaleString()}K`, capDelta };
    }
  }

  return { isValid: true, capDelta };
}
