// Keep this tiny + explicit. You only need the airports you actually use.

export const AIRPORT_TO_COUNTRY: Record<string, string> = {
    // Netherlands
    AMS: "NL",

    // France
    CDG: "FR",
    NCE: "FR",

    // Spain
    BCN: "ES",
    MAD: "ES",

    // Portugal
    LIS: "PT",

    // Czechia
    PRG: "CZ",

    // Denmark
    CPH: "DK",

    // Austria
    VIE: "AT",

    // Switzerland
    ZRH: "CH",
    GVA: "CH",

    // Italy
    FCO: "IT",
    MXP: "IT",

    // Norway
    OSL: "NO",

    // Sweden
    ARN: "SE",

    // Belgium
    BRU: "BE",

    // Germany
    DUS: "DE",
    HAM: "DE",
    BER: "DE",
    MUC: "DE",
    FRA: "DE",

    // Poland
    WAW: "PL",

    // Finland
    HEL: "FI",

    // UK (for your origins too, if you want flags on the left)
    MAN: "GB",
    LPL: "GB",
};