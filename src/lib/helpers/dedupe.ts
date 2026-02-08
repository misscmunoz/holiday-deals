// src/lib/dedupe.ts
import type { Deal } from "@/lib/types/deals";
import { makeDealKey } from "@/lib/helpers/makeDealKey";

export function dedupeDeals(deals: Deal[]): Deal[] {
    const seen = new Set<string>();
    return deals.filter((d) => {
        const k = makeDealKey(d);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}