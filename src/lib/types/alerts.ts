import type { Deal } from "./deals";

export type AlertReason = "NEW_DEAL" | "PRICE_DROP";

export type AlertItem = {
    deal: Deal;
    context: string;
    reason: AlertReason;
    dropGBP?: number;
    dropPct?: number;
};