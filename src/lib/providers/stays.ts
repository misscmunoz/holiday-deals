import type { StayQuote, Trip } from "@/lib/providers/types";

// Hostel-first policy for now.
// Later you can:
// - prefer hostel, fallback to hotel
// - cap price
// - add neighborhood/ratings filters
export async function getCheapestStayHostelFirst(_trip: Trip): Promise<StayQuote | null> {
  // Stubbed. Return null until you integrate a legit accommodation API/provider.
  // When implemented, return total stay cost in GBP (e.g. 2 nights).
  return null;
}
