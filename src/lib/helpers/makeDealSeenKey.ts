/**
 * Prisma unique key
 */
import type { Deal } from "@/lib/types/deals";

export function makeDealSeenKey(args: {
    deal: Deal;
    context: string;
}) {
    const returnDateKey = args.deal.returnDate ?? "";

    return {
        context: args.context, // must match Prisma column type (string)
        origin: args.deal.origin,
        destination: args.deal.destination,
        departDate: args.deal.departDate,
        returnDateKey,
    };
}