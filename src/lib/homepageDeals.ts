import { prisma } from "@/lib/db";
import type { Deal } from "@/lib/types";

export async function getHomepageDeals(args?: { take?: number }): Promise<Deal[]> {
    const take = args?.take ?? 80;
    const alertMax = Number(process.env.ALERT_MAX_PRICE_GBP ?? "150");

    const rows = await prisma.dealSeen.findMany({
        orderBy: [{ lastAlertedAt: "desc" }, { lastSeenAt: "desc" }],
        take,
    });

    // Show “actionable-ish” stuff on the homepage by default
    const filtered = rows.filter(r => r.lastPrice <= alertMax);

    return filtered.map((r) => ({
        origin: r.origin,
        destination: r.destination,
        departDate: r.departDate,
        returnDate: r.returnDate ?? null,
        priceGBP: r.lastPrice,
        currency: "GBP",
    }));
}