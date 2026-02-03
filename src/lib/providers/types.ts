export type DealCategory = "FLIGHT_ONLY" | "FLIGHT_PLUS_STAY";

export type Trip = {
  origin: string;       // e.g. MAN
  destination: string;  // e.g. AMS
  departDate: string;   // YYYY-MM-DD
  returnDate: string;   // YYYY-MM-DD
  adults: number;
};

export type Money = {
  amount: number;
  currency: "GBP";
};

export type FlightQuote = {
  provider: "amadeus" | "duffel";
  price: Money;
  deeplink?: string;
  // Optional extras you might show later:
  // carriers?: string[];
  // stops?: number;
};

export type StayType = "hostel" | "hotel";

export type StayQuote = {
  provider: "stub" | "booking" | "expedia" | "amadeus_hotels";
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
