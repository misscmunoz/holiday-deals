import { toISODate } from "@/lib/dates";

type GovUkBankHolidays = {
  "england-and-wales": { events: Array<{ title: string; date: string }> };
  scotland: { events: Array<{ title: string; date: string }> };
  "northern-ireland": { events: Array<{ title: string; date: string }> };
};

export type BankHolidayWeekend = {
  title: string;
  holidayDate: string;        // actual bank holiday date

  titles: string[];
  holidayDates: string[];

  startDate: string;          // suggested trip start (usually Fri)
  endDate: string;            // suggested trip end (usually Mon/Tue)
  region: "england-and-wales" | "scotland" | "northern-ireland";
};

export async function getBankHolidayWeekends(args?: {
  region?: BankHolidayWeekend["region"]; // default: england-and-wales
  daysAhead?: number; // default: 180
}): Promise<BankHolidayWeekend[]> {
  const region = args?.region ?? "england-and-wales";
  const daysAhead = args?.daysAhead ?? 180;

  const res = await fetch("https://www.gov.uk/bank-holidays.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Bank holidays fetch failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as GovUkBankHolidays;
  const events = json[region]?.events ?? [];

  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + daysAhead);

  const out: BankHolidayWeekend[] = [];

  for (const ev of events) {
    const d = new Date(ev.date + "T00:00:00Z"); // date is YYYY-MM-DD
    if (d < start || d > end) continue;

    // Determine the "long weekend" around the holiday
    // JS getUTCDay: Sun=0..Sat=6
    const dow = d.getUTCDay();

    // If BH is Monday (1): suggest Fri->Mon (3 nights)
    // If BH is Friday (5): suggest Fri->Mon as well
    // If BH is Tuesday (2): suggest Fri->Tue (4 nights) (optional)
    // If BH is Thursday (4): suggest Thu->Sun (or Fri->Mon). We'll pick Fri->Mon for simplicity.
    const startDate = suggestStart(dow, d);
    const endDate = suggestEnd(dow, d);

    out.push({
      title: ev.title,
      holidayDate: ev.date,
      titles: [ev.title],
      holidayDates: [ev.date],
      startDate,
      endDate,
      region,
    });
  }

  // sort by holiday date
  out.sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
  // Dedupe by (region + startDate + endDate)
  // If multiple holidays map to the same long-weekend window (e.g. Good Friday + Easter Monday),
  // keep the earliest holidayDate but merge titles for context.
  const uniq = new Map<string, BankHolidayWeekend>();

  for (const w of out) {
    const key = `${w.region}|${w.startDate}|${w.endDate}`;
    const existing = uniq.get(key);

    if (!existing) {
      uniq.set(key, w);
      continue;
    }

     // Merge arrays, keeping uniqueness and stable order
  const mergedTitles = Array.from(new Set([...existing.titles, ...w.titles]));
  const mergedDates = Array.from(new Set([...existing.holidayDates, ...w.holidayDates]))
    .sort((a, b) => a.localeCompare(b));

  // Keep earliest holidayDate as the "primary" date/title
  const primaryDate = mergedDates[0];
  const primaryTitle =
    primaryDate === existing.holidayDate ? existing.title : w.title;

  uniq.set(key, {
    ...existing,
    title: primaryTitle,
    holidayDate: primaryDate,
    titles: mergedTitles,
    holidayDates: mergedDates,
  });
}

return Array.from(uniq.values());
}

function suggestStart(dow: number, holiday: Date) {
  // default: previous Friday
  const d = new Date(holiday);
  // move to Friday before holiday week
  // If holiday is Monday, subtract 3 days
  // If Tuesday, subtract 4 days
  // If Friday, 0
  // Else: go to nearest prior Friday
  const diffToFriday = (d.getUTCDay() + 2) % 7; // days since Friday
  d.setUTCDate(d.getUTCDate() - diffToFriday);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
}

function suggestEnd(_dow: number, holiday: Date) {
  // default: following Monday
  const d = new Date(holiday);
  // If holiday is Tuesday, end Tuesday (same day) to make Fri->Tue
  if (d.getUTCDay() === 2) {
    return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
  }
  // else end on holiday if it's Monday, or next Monday otherwise
  const day = d.getUTCDay();
  const daysToMonday = (8 - day) % 7; // 0 if Monday, otherwise to next Monday
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
}
