export interface Period {
  year: number;
  month: number; // 1-12 — the month the 21st (start) falls in
  label: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
}

function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}

export function getPeriodForDate(date: Date): { year: number; month: number } {
  const day = date.getDate();
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (day >= 21) return { year, month };
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function getPeriod(year: number, month: number): Period {
  const startDate = `${year}-${padTwo(month)}-21`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${padTwo(endMonth)}-20`;

  const start = new Date(year, month - 1, 21);
  const end = new Date(endYear, endMonth - 1, 20);

  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("da-DK", opts);

  const label = `${fmt(start, { day: "numeric", month: "long" })} – ${fmt(end, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;

  return { year, month, label, startDate, endDate };
}

export function getCurrentPeriod(): Period {
  const { year, month } = getPeriodForDate(new Date());
  return getPeriod(year, month);
}

export function getPreviousPeriod(p: Period): Period {
  if (p.month === 1) return getPeriod(p.year - 1, 12);
  return getPeriod(p.year, p.month - 1);
}

export function getNextPeriod(p: Period): Period {
  if (p.month === 12) return getPeriod(p.year + 1, 1);
  return getPeriod(p.year, p.month + 1);
}
