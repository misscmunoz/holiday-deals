// lib/utils/deals.ts
import type { Deal } from "@/lib/types";

/**
 * This MUST match your Prisma unique key:
 * @@unique([context, origin, destination, departDate, returnDateKey])
 */
export function makeDealKey(d: Deal): string {
    return [
        d.context,
        d.origin,
        d.destination,
        d.departDate,
        d.returnDate ?? ""
    ].join("::");
}