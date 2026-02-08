import type { DealCategory } from "@/lib/types";

export type DealContext = string;

// regular:FLIGHT_ONLY
export function regularContext(category: DealCategory): DealContext {
    return `regular:${category}`;
}

// bh:2026-05-04:FLIGHT_ONLY
export function bankHolidayContext(holidayDate: string, category: DealCategory): DealContext {
    return `bh:${holidayDate}:${category}`;
}