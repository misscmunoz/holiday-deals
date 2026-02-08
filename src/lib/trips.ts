import { nextFridays } from "@/lib/dates";
import type { Trip } from "@/lib/types";

export function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekendTrips(args: {
  origins: string[];
  destinations: string[];
  weeksAhead: number;
  adults?: number;
}): Trip[] {
  const adults = args.adults ?? 1;
  const fridays = nextFridays(args.weeksAhead);

  const trips: Trip[] = [];

  for (const origin of args.origins) {
    for (const destination of args.destinations) {
      for (const fri of fridays) {
        const sun = addDays(fri, 2);
        trips.push({ origin, destination, departDate: fri, returnDate: sun, adults });
      }
    }
  }

  return trips;
}
