// Danish tax calculation for taxi drivers (2025 rules)
// AM-bidrag: 8% of gross income
// Personfradrag 2025: 49.700 kr/år
// A-skat: user-defined rate applied to (AM-indkomst - monthly personfradrag)

export interface TaxInput {
  totalIndkoert: number;     // sum of total_indkoert for the period
  loenstype: "loenmodtager" | "provisions";
  skatteprocent: number;     // e.g. 37 (= 37%)
  provisionSats: number;     // e.g. 50 (= 50%), only for 'provisions'
}

export interface TaxResult {
  totalIndkoert: number;
  bruttoIndkomst: number;         // gross before deductions
  amBidrag: number;               // 8% of bruttoIndkomst
  amIndkomst: number;             // bruttoIndkomst * 0.92
  personfradrag: number;          // monthly personfradrag
  skattepligtigIndkomst: number;  // max(0, amIndkomst - personfradrag)
  aSkat: number;                  // skattepligtigIndkomst * skatteprocent/100
  netUdbetaling: number;          // bruttoIndkomst - amBidrag - aSkat
}

const PERSONFRADRAG_AARLIG = 49_700;
const AM_SATS = 0.08;

export function beregnLoen(input: TaxInput): TaxResult {
  const { totalIndkoert, loenstype, skatteprocent, provisionSats } = input;

  const bruttoIndkomst =
    loenstype === "provisions"
      ? totalIndkoert * (provisionSats / 100)
      : totalIndkoert;

  const amBidrag = bruttoIndkomst * AM_SATS;
  const amIndkomst = bruttoIndkomst - amBidrag;
  const personfradrag = PERSONFRADRAG_AARLIG / 12;
  const skattepligtigIndkomst = Math.max(0, amIndkomst - personfradrag);
  const aSkat = skattepligtigIndkomst * (skatteprocent / 100);
  const netUdbetaling = bruttoIndkomst - amBidrag - aSkat;

  return {
    totalIndkoert,
    bruttoIndkomst,
    amBidrag,
    amIndkomst,
    personfradrag,
    skattepligtigIndkomst,
    aSkat,
    netUdbetaling,
  };
}

export function formatKr(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
