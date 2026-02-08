import { Deal } from "@/lib/types/deals";
import { amadeusGet } from "@/lib/amadeus";
import { dedupeDeals } from "@/lib/helpers/dedupe";
import { toISODate, nextFridays } from "@/lib/dates";
import type { InspirationResponse } from "@/lib/types/api";
import { makeDealKey } from "./helpers/makeDealKey";

const SEARCH_DAYS_AHEAD = 30;
const SEARCH_WEEKS_AHEAD = 5;

const MAX_PRICE = Number(process.env.MAX_PRICE_GBP ?? "150");
const ORIGINS = (process.env.ORIGINS ?? "LPL,MAN")
  .split(",")
  .map(s => s.trim());


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
          duration: "2,3",
          currency: "GBP",
          maxPrice: String(MAX_PRICE),
        }
      );

      const rows = Array.isArray(json.data) ? json.data : [];

      for (const r of rows) {
        if (!r.departureDate || !fridays.has(r.departureDate)) continue;

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
      continue;
    }
  }

  const uniqueDeals = dedupeDeals(deals);
  uniqueDeals.sort((a, b) => a.priceGBP - b.priceGBP);
  return uniqueDeals;
}

export async function fetchDealsForDateRange(args: {
  startDate: string;
  endDate: string;
  durationDays: string;
}) {
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

  const seen = new Set<string>();
  const uniqueDeals = deals.filter(d => {
    const key = makeDealKey(d);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
  context: string;
  origin: string;
  departDate: string;
  returnDate: string;
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

  const uniqueDeals = dedupeDeals(deals);
  uniqueDeals.sort((a, b) => a.priceGBP - b.priceGBP);
  return uniqueDeals;
}