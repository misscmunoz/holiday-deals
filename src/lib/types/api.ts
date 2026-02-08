import type { AlertItem } from "./alerts";

export type AlertsRunResponse = {
    origins: string[];
    destinations: number;
    categories: string[];
    thresholds: {
        storeMaxGBP: number;
        alertMaxGBP: number;
        priceDropThresholdGBP: number;
    };
    checkedTrips: unknown;
    alerts: {
        totalDetected: number;
        actionable: number;
        suppressedByBudget: number;
    };
    alertsSample: AlertItem[];
    note?: string;
};

export type InspirationResponse = {
    data?: Array<{
        origin: string;
        destination: string;
        departureDate: string;
        returnDate?: string | null;
        price?: {
            total?: string;
            currency?: string;
        };
    }>;
};