import type { DealCategory, TravelDeal, Trip } from "@/lib/providers/types";
import { getCheapestFlightAmadeus } from "@/lib/providers/amadeusFlights";
import { getCheapestFlightDuffel } from "@/lib/providers/duffelFlights";
import { getCheapestStayHostelFirst } from "@/lib/providers/stays";

async function getBestFlight(trip: Trip) {
  // Run providers in parallel, pick cheapest non-null
  const [a, d] = await Promise.allSettled([
    getCheapestFlightAmadeus(trip),
    getCheapestFlightDuffel(trip),
  ]);

  const quotes = [a, d]
    .map(r => (r.status === "fulfilled" ? r.value : null))
    .filter((q): q is NonNullable<typeof q> => !!q);

  if (quotes.length === 0) return null;
  quotes.sort((x, y) => x.price.amount - y.price.amount);
  return quotes[0];
}

export async function buildDealsForTrip(trip: Trip, categories: DealCategory[], opts?: { debug?: boolean, maxTotalGBP?: number }): Promise<TravelDeal[]> {
  const deals: TravelDeal[] = [];
  const maxTotal = opts?.maxTotalGBP ?? Number(process.env.STORE_MAX_PRICE_GBP ?? "400");

  const flight = await getBestFlight(trip);
  if (!flight) {
    if (opts?.debug) {
      return [{
        category: "FLIGHT_ONLY",
        trip,
        flight: { provider: "amadeus", price: { amount: 0, currency: "GBP" } },
        total: { amount: 0, currency: "GBP" },
        notes: ["NO_FLIGHT_FOUND"],
      }];
    }
    return deals;
  }

  // Flight-only
  if (categories.includes("FLIGHT_ONLY")) {
    if (flight.price.amount <= maxTotal) {
      deals.push({
        category: "FLIGHT_ONLY",
        trip,
        flight,
        total: flight.price,
      });
    }
  }

  // Flight + Stay (hostel-first)
  if (categories.includes("FLIGHT_PLUS_STAY")) {
    const stay = await getCheapestStayHostelFirst(trip);

    // If no stay provider yet, we just skip this category for now.
    if (stay) {
      const totalAmount = flight.price.amount + stay.total.amount;
      if (totalAmount <= maxTotal) {
        deals.push({
          category: "FLIGHT_PLUS_STAY",
          trip,
          flight,
          stay,
          total: { amount: totalAmount, currency: "GBP" },
          notes: stay.stayType === "hostel" ? ["hostel-first"] : undefined,
        });
      }
    }
  }

  return deals;
}
