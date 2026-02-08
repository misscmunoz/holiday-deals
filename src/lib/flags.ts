import * as Flags from "country-flag-icons/react/3x2";
import { AIRPORT_TO_COUNTRY } from "@/lib/airportCountries";
import type React from "react";

type FlagComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export function flagForAirport(iata: string): FlagComponent {
    const key = iata.toUpperCase();
    const iso2 = (AIRPORT_TO_COUNTRY[key] ?? "GB").toUpperCase() as keyof typeof Flags;
    return (Flags[iso2] ?? Flags.GB) as FlagComponent;
}

export function countryForAirport(iata: string): string {
    return AIRPORT_TO_COUNTRY[iata.toUpperCase()] ?? "GB";
}