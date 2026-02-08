"use client";

import React from "react";
import type { Deal } from "@/lib/types";

import { deleteDealsByKeys } from "@/app/actions/deleteDeals";
import { makeDealKey } from "@/lib/makeDealKey";
import { Flag } from "./Flag";
import { formatDealDates } from "@/lib/dates";
import { usePersistedCheckboxMap } from "@/hooks/usePersistedCheckboxMap";

type Props = { deals: Deal[] };

export default function DealsTable({ deals }: Props) {
    const [q, setQ] = React.useState("");
    const [maxPrice, setMaxPrice] = React.useState("150");

    const sorted = React.useMemo(() => {
        const query = q.trim().toLowerCase();
        const max = Number(maxPrice);

        const filtered = deals.filter((d) => {
            const route = `${d.origin}-${d.destination}`.toLowerCase();
            const matchesQuery =
                !query ||
                route.includes(query) ||
                d.origin.toLowerCase().includes(query) ||
                d.destination.toLowerCase().includes(query);

            const matchesPrice = Number.isFinite(max) ? d.priceGBP <= max : true;
            return matchesQuery && matchesPrice;
        });

        return filtered.sort((a, b) => {
            if (a.priceGBP !== b.priceGBP) return a.priceGBP - b.priceGBP;
            return a.departDate.localeCompare(b.departDate);
        });
    }, [deals, q, maxPrice]);

    const STORAGE_KEY = "selectedDeals";

    const [selectedKeys, setSelectedKeys] = usePersistedCheckboxMap(STORAGE_KEY);
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
        }
    }, [selectedKeys]);

    // ✅ Use the SAME key format everywhere
    const allVisibleKeys = sorted.map(makeDealKey);

    const areAllSelected = allVisibleKeys.every((k) => selectedKeys[k]);
    const isIndeterminate =
        allVisibleKeys.some((k) => selectedKeys[k]) && !areAllSelected;

    const toggleSelectAll = () => {
        setSelectedKeys((prev) => {
            const next = { ...prev };
            const shouldSelectAll = !areAllSelected;

            for (const key of allVisibleKeys) {
                if (shouldSelectAll) {
                    next[key] = true;
                } else {
                    delete next[key];
                }
            }

            return next;
        });
    };

    return (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="p-5">
                {/* Controls */}
                <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-white/90">Search</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="e.g. MAN-BCN or BCN"
                            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-white/90">Max price</label>
                        <select
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white outline-none focus:ring-2 focus:ring-white/20"
                        >
                            {["80", "100", "120", "150", "200", "300", "400"].map((p) => (
                                <option key={p} value={p} className="bg-zinc-900">
                                    £{p}
                                </option>
                            ))}
                        </select>
                    </div>

                    {Object.keys(selectedKeys).length > 0 && (
                        <div className="col-span-full mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                            <span>
                                {Object.keys(selectedKeys).length} deal
                                {Object.keys(selectedKeys).length > 1 && "s"} selected
                            </span>

                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        const selected = Object.keys(selectedKeys);
                                        if (selected.length === 0) return;

                                        const confirmed = confirm(
                                            `Delete ${selected.length} deal(s)?`
                                        );
                                        if (!confirmed) return;

                                        try {
                                            await deleteDealsByKeys(selected);
                                            setSelectedKeys({});
                                            window.location.reload();
                                        } catch (err) {
                                            console.error(err);
                                            alert("Failed to delete deals.");
                                        }
                                    }}
                                    className="rounded-lg bg-white/10 px-4 py-1.5 text-white hover:bg-white/20 transition"
                                >
                                    Delete
                                </button>

                                <button
                                    onClick={() => setSelectedKeys({})}
                                    className="rounded-lg bg-red-500/20 px-4 py-1.5 text-red-300 hover:bg-red-500/30 transition"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full table-auto">
                        <thead className="bg-white/[0.04]">
                            <tr className="[&>th]:px-4 [&>th]:py-3">
                                <th className="w-10 px-4">
                                    <input
                                        type="checkbox"
                                        checked={areAllSelected}
                                        ref={(input) => {
                                            if (input) input.indeterminate = isIndeterminate;
                                        }}
                                        onChange={toggleSelectAll}
                                        className="accent-white/70"
                                    />
                                </th>
                                <th className="text-left text-xs font-semibold tracking-[0.18em] text-white/55">
                                    Route
                                </th>
                                <th className="text-left text-xs font-semibold tracking-[0.18em] text-white/55">
                                    Dates
                                </th>
                                <th className="text-right text-xs font-semibold tracking-[0.18em] text-white/55">
                                    Price
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/10">
                            {sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-white/60">
                                        No deals match your filters (airlines are ghosting again).
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((d) => {
                                    const key = makeDealKey(d);

                                    return (
                                        <tr
                                            key={key}
                                            className="bg-transparent hover:bg-white/[0.035] transition-colors"
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedKeys[key]}
                                                    onChange={() =>
                                                        setSelectedKeys((prev) => ({
                                                            ...prev,
                                                            [key]: !prev[key],
                                                        }))
                                                    }
                                                    className="accent-white/70"
                                                />
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Flag iata={d.origin} />
                                                    <span className="font-semibold text-white">
                                                        {d.origin}{" "}
                                                        <span className="text-white/50">→</span>{" "}
                                                        {d.destination}
                                                    </span>
                                                    <Flag iata={d.destination} />
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-white/70">
                                                {formatDealDates(d)}
                                            </td>

                                            <td className="px-4 py-4 text-right font-bold text-white">
                                                £{d.priceGBP.toFixed(0)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer stats */}
            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end m-5">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
                    Showing <b className="text-white">{sorted.length}</b>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
                    Max <b className="text-white">£{maxPrice}</b>
                </span>
            </div>
        </div>
    );
}