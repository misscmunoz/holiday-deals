
"use client";
import Image from "next/image";
import { AIRPORT_TO_COUNTRY } from "@/lib/airportCountries";

export function Flag({ iata }: { iata: string }) {
    const country = AIRPORT_TO_COUNTRY[iata];
    if (!country) return null;

    return (
        <Image
            src={`https://flagcdn.com/w20/${country.toLowerCase()}.png`}
            width={20}
            height={14}
            alt={country}
            className="rounded-[4px] ring-1 ring-white/10"
        />
    );
}