/**
 *  for frontend / in-memory dedupe
 */
import type { Deal } from "@/lib/types/deals";

/** Key for deduping *within an array* (NOT the Prisma unique key) */
export function makeDealKey(d: Deal): string {
    return [
        d.origin,
        d.destination,
        d.departDate,
        d.returnDate ?? "",
    ].join("|");
}