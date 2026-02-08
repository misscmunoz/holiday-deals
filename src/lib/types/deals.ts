export type Deal = {
    context: string;
    origin: string;
    destination: string;
    departDate: string;        // YYYY-MM-DD
    returnDate: string | null; // ALWAYS present, null if one-way
    returnDateKey: string;
    priceGBP: number;
    currency: string;          // keep string for now
};

export type LatestDealsResponse = {
    deals: Array<{
        origin: string;
        destination: string;
        departDate: string;
        returnDate: string | null;
        lastPrice: number;
        lastSeenAt: string;
        context: string;
    }>;
};

export type DealLine = {
    origin: string;
    destination: string;
    departDate: string;
    returnDate: string | null;
    priceGBP: number;
    reason: string;
};