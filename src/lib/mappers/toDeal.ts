import type { Deal } from "../types/deals";
import type { TravelDeal, Trip } from "../types/travel";

type HasTripAndTotal = {
    trip: Trip;
    total: { amount: number; currency: "GBP" };
};

/**
 * Canonical converter → Deal
 * Works for:
 * - TravelDeal
 * - { trip, total } objects
 */
export function toDeal(input: TravelDeal | HasTripAndTotal): Deal {
    const trip = input.trip;
    const total = input.total;

    return {
        origin: trip.origin,
        destination: trip.destination,
        departDate: trip.departDate,
        returnDate: trip.returnDate ?? null,
        priceGBP: total.amount,
        currency: total.currency,
    };
}