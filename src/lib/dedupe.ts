import type { DealLike } from "@/lib/types/deals";

export function dedupeDeals(deals: DealLike[]) {
    const seen = new Set<string>();
    return deals.filter((d) => {
        const key = `${d.origin}|${d.destination}|${d.departDate}|${d.returnDate ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}