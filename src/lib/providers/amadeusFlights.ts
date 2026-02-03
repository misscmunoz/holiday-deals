import { amadeusGet } from "@/lib/amadeus";
import type { FlightQuote, Trip } from "@/lib/providers/types";

type FlightOffersResponse = {
  data?: Array<{
    price?: { total?: string; currency?: string };
  }>;
};

export async function getCheapestFlightAmadeus(trip: Trip): Promise<FlightQuote | null> {
  const json = await amadeusGet<FlightOffersResponse>("/v2/shopping/flight-offers", {
    originLocationCode: trip.origin,
    destinationLocationCode: trip.destination,
    departureDate: trip.departDate,
    returnDate: trip.returnDate,
    adults: String(trip.adults ?? 1),
    currencyCode: "GBP",
    max: "10",
    nonStop: "false",
  });

  const offers = Array.isArray(json.data) ? json.data : [];
  if (offers.length === 0) return null;

  let best = Number.POSITIVE_INFINITY;
  for (const o of offers) {
    const p = Number(o.price?.total);
    if (Number.isFinite(p) && p < best) best = p;
  }

  if (!Number.isFinite(best)) return null;

  return {
    provider: "amadeus",
    price: { amount: best, currency: "GBP" },
  };
}
