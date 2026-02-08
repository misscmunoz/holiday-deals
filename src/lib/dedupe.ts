import type { Deal } from "@/lib/types/deals";

export function dedupeDeals(deals: Deal[]) {
    const seen = new Set<string>();
    return deals.filter((d) => {
        const key = `${d.origin}|${d.destination}|${d.departDate}|${d.returnDate ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}