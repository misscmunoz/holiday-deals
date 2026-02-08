export type DealCategory = "FLIGHT_ONLY" | "FLIGHT_PLUS_STAY";

export type Trip = {
    origin: string;       // MAN
    destination: string;  // AMS
    departDate: string;   // YYYY-MM-DD
    returnDate: string;   // YYYY-MM-DD (Trips are always return in your app)
    adults: number;
};

export type Currency = "GBP"; // can widen later
export type Money = {
    amount: number;
    currency: Currency;
};

export type FlightProvider = "amadeus" | "duffel";
export type FlightQuote = {
    provider: FlightProvider;
    price: Money;
    deeplink?: string;
};

export type StayType = "hostel" | "hotel";
export type StayProvider = "stub" | "booking" | "expedia" | "amadeus_hotels";

export type StayQuote = {
    provider: StayProvider;
    stayType: StayType;
    total: Money; // total for entire stay
    name?: string;
    deeplink?: string;
};

export type TravelDeal = {
    category: DealCategory;
    trip: Trip;
    flight: FlightQuote;
    stay?: StayQuote;
    total: Money; // flight + stay (if present)
    notes?: string[];
};