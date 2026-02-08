import type { FlightQuote, Trip } from "@/lib/types";

export async function getCheapestFlightDuffel(_trip: Trip): Promise<FlightQuote | null> {
  // Stubbed for architecture clarity.
  // Later: call Duffel API and return cheapest quote.
  // If not configured, return null so pipeline still works.
  return null;
}
