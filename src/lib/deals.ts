import { amadeusGet } from "@/lib/amadeus";
import { toISODate, nextFridays } from "@/lib/dates";

const SEARCH_DAYS_AHEAD = 30;
const SEARCH_WEEKS_AHEAD = 5;

export type Deal = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  priceGBP: number;
  currency: string;
};

const MAX_PRICE = Number(process.env.MAX_PRICE_GBP ?? "150");
const ORIGINS = (process.env.ORIGINS ?? "LPL,MAN")
  .split(",")
  .map(s => s.trim());

type InspirationResponse = {
  data?: Array<{
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string | null;
    price?: { total?: string; currency?: string };
  }>;
};

/**
 * Fetches Weekend Deals
 */
export async function fetchWeekendDeals() {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + SEARCH_DAYS_AHEAD);

  const dateFrom = toISODate(start);
  const dateTo = toISODate(end);

  const fridays = new Set(nextFridays(SEARCH_WEEKS_AHEAD));
  const deals: Deal[] = [];

  for (const origin of ORIGINS) {
    try {
      const json = await amadeusGet<InspirationResponse>(
        "/v1/shopping/flight-destinations",
        {
          origin,
          departureDate: `${dateFrom},${dateTo}`,
          duration: "2,3", // weekend-ish
          currency: "GBP",
          maxPrice: String(MAX_PRICE),
        }
      )

      const rows = Array.isArray(json.data) ? json.data : [];


      for (const r of rows) {
        if (!r.departureDate || !fridays.has(r.departureDate)) continue;
        console.log(
          `[${origin}] sample departureDates:`,
          rows.slice(0, 5).map(r => r.departureDate)
        );

        const price = Number(r.price?.total);
        if (!Number.isFinite(price) || price > MAX_PRICE) continue;

        deals.push({
          origin: r.origin,
          destination: r.destination,
          departDate: r.departureDate,
          returnDate: r.returnDate ?? null,
          priceGBP: price,
          currency: r.price?.currency ?? "GBP",
        });
      }
    } catch (e) {
      console.error(`[Amadeus] inspiration failed for origin=${origin}`, e);
      // skip this origin
      continue;

    }
  }

  // --- DEDUPE DEALS ---
  const seen = new Set<string>();
  const uniqueDeals = deals.filter(d => {
    const key = `${d.origin}|${d.destination}|${d.departDate}|${d.returnDate ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // cheapest first
  uniqueDeals.sort((a, b) => a.priceGBP - b.priceGBP);
  return uniqueDeals;
}

/**
 * Fetches Specific Date Deals
 * (used in bank holiday)
 */
export async function fetchDealsForDateRange(args: {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  durationDays: string; // e.g. "3,4"
}) {
  const MAX_PRICE = Number(process.env.MAX_PRICE_GBP ?? "150");
  const ORIGINS = (process.env.ORIGINS ?? "LPL,MAN").split(",").map(s => s.trim());

  const deals: Deal[] = [];

  for (const origin of ORIGINS) {
    try {
      const json = await amadeusGet<InspirationResponse>(
        "/v1/shopping/flight-destinations",
        {
          origin,
          departureDate: `${args.startDate},${args.endDate}`,
          duration: args.durationDays,
          currency: "GBP",
          maxPrice: String(MAX_PRICE),
        }
      );

      const rows = Array.isArray(json.data) ? json.data : [];
      for (const r of rows) {
        const price = Number(r.price?.total);
        if (!Number.isFinite(price) || price > MAX_PRICE) continue;

        deals.push({
          origin: r.origin,
          destination: r.destination,
          departDate: r.departureDate,
          returnDate: r.returnDate ?? null,
          priceGBP: price,
          currency: r.price?.currency ?? "GBP",
        });
      }
    } catch (e) {
      console.error(
        `[Amadeus] date-range inspiration failed origin=${origin} start=${args.startDate} end=${args.endDate}`,
        e
      );
      continue;
    }
  }

  // --- DEDUPE DEALS ---
  const seen = new Set<string>();
  const uniqueDeals = deals.filter(d => {
    const key = `${d.origin}|${d.destination}|${d.departDate}|${d.returnDate ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // cheapest first
  uniqueDeals.sort((a, b) => a.priceGBP - b.priceGBP);
  return uniqueDeals;

}

type FlightOffersResponse = {
  data?: Array<{
    price?: { total?: string; currency?: string };
    itineraries?: Array<{
      segments?: Array<{
        departure?: { iataCode?: string; at?: string };
        arrival?: { iataCode?: string; at?: string };
      }>;
    }>;
  }>;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

const DESTINATIONS = uniq(
  (process.env.DESTINATIONS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

export async function fetchWeekendDealsViaOffers(args: {
  origin: string;
  departDate: string;  // YYYY-MM-DD
  returnDate: string;  // YYYY-MM-DD
}) {
  const deals: Deal[] = [];

  for (const destination of DESTINATIONS) {
    try {
      const json = await amadeusGet<FlightOffersResponse>(
        "/v2/shopping/flight-offers",
        {
          originLocationCode: args.origin,
          destinationLocationCode: destination,
          departureDate: args.departDate,
          returnDate: args.returnDate,
          adults: "1",
          currencyCode: "GBP",
          max: "5",
          nonStop: "false",
        }
      );

      const offers = Array.isArray(json.data) ? json.data : [];
      if (offers.length === 0) continue;

      // cheapest offer for that destination
      let best = offers[0];
      let bestPrice = Number(best.price?.total);

      for (const o of offers) {
        const p = Number(o.price?.total);
        if (Number.isFinite(p) && p < bestPrice) {
          best = o;
          bestPrice = p;
        }
      }

      if (!Number.isFinite(bestPrice) || bestPrice > MAX_PRICE) continue;

      deals.push({
        origin: args.origin,
        destination,
        departDate: args.departDate,
        returnDate: args.returnDate,
        priceGBP: bestPrice,
        currency: best.price?.currency ?? "GBP",
      });
    } catch (e) {
      console.error(
        `[Amadeus] flight-offers failed ${args.origin}->${destination} ${args.departDate}-${args.returnDate}`,
        e
      );
      continue;
    }
  }

  // dedupe + sort
  const seen = new Set<string>();
  const uniqueDeals = deals.filter(d => {
    const key = `${d.origin}|${d.destination}|${d.departDate}|${d.returnDate ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  uniqueDeals.sort((a, b) => a.priceGBP - b.priceGBP);
  return uniqueDeals;
}
