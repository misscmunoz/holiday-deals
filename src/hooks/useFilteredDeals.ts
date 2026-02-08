import { useMemo, useState } from "react";
import type { Deal } from "@/lib/types";

export function useFilteredDeals(deals: Deal[]) {
    const [q, setQ] = useState("");
    const [maxPrice, setMaxPrice] = useState<string>("150");

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        const max = Number(maxPrice);

        return deals.filter(d => {
            const route = `${d.origin}-${d.destination}`.toLowerCase();
            const matchesQuery =
                !query ||
                route.includes(query) ||
                d.destination.toLowerCase().includes(query);

            const matchesPrice = !Number.isFinite(max) || d.priceGBP <= max;
            return matchesQuery && matchesPrice;
        });
    }, [deals, q, maxPrice]);

    const sortedDeals = useMemo(() => {
        return [...filtered].sort((a, b) => {
            if (a.priceGBP !== b.priceGBP) return a.priceGBP - b.priceGBP;
            return a.departDate.localeCompare(b.departDate);
        });
    }, [filtered]);

    return {
        q,
        setQ,
        maxPrice,
        setMaxPrice,
        sortedDeals,
    };
}