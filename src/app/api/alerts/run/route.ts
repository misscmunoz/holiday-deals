import { NextResponse } from "next/server";
import { buildDealsForTrip } from "@/lib/dealBuilder";
import { weekendTrips } from "@/lib/trips";
import { getBankHolidayWeekends } from "@/lib/bankHolidays";
import { upsertAndDetectAlert, type AlertItem } from "@/lib/alerts";
import type { DealCategory, Trip } from "@/lib/types/travel";
import { asyncPool } from "@/lib/asyncPool";
import { toDeal } from "@/lib/mappers/toDeal";

const PRICE_DROP_THRESHOLD_GBP = 15;

// Tune these for speed/cost
const CONCURRENCY = 5;
const WEEKEND_TRIP_CAP = 80;
const BH_TRIP_CAP = 40;

const STORE_MAX_PRICE_GBP = Number(process.env.STORE_MAX_PRICE_GBP ?? "400");
const ALERT_MAX_PRICE_GBP = Number(process.env.ALERT_MAX_PRICE_GBP ?? "150");

const ORIGINS = (process.env.ORIGINS ?? "MAN,LPL")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Use SAMPLE_DESTINATIONS for dev; swap to DESTINATIONS for prod whenever you want
const DESTINATIONS = (process.env.SAMPLE_DESTINATIONS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CATEGORIES: DealCategory[] = ["FLIGHT_ONLY", "FLIGHT_PLUS_STAY"];
const WEEKS_AHEAD = 4;

export async function GET() {
  try {
    const allAlerts: AlertItem[] = [];
    const actionableAlerts: AlertItem[] = [];
    let suppressedByBudget = 0;

    /**
     * 1) REGULAR WEEKENDS (Fri -> Sun)
     */
    const trips = weekendTrips({
      origins: ORIGINS,
      destinations: DESTINATIONS,
      weeksAhead: WEEKS_AHEAD,
      adults: 1,
    });

    const cappedWeekendTrips = trips.slice(0, WEEKEND_TRIP_CAP);

    const weekendDealBatches = await asyncPool(CONCURRENCY, cappedWeekendTrips, async (trip) =>
      buildDealsForTrip(trip, CATEGORIES, { maxTotalGBP: STORE_MAX_PRICE_GBP })
    );

    const weekendDeals = weekendDealBatches.flat();

    const weekendByCategory = weekendDeals.reduce<Record<string, number>>((acc, d) => {
      acc[d.category] = (acc[d.category] ?? 0) + 1;
      return acc;
    }, {});

    for (const d of weekendDeals) {
      const context = `regular:${d.category}`;
      const deal = toDeal(d);

      const alert = await upsertAndDetectAlert({
        deal,
        context,
        priceDropThresholdGBP: PRICE_DROP_THRESHOLD_GBP,
      });

      if (alert) {
        allAlerts.push(alert);

        if (deal.priceGBP <= ALERT_MAX_PRICE_GBP) actionableAlerts.push(alert);
        else suppressedByBudget += 1;
      }
    }

    /**
     * 2) BANK HOLIDAY WINDOWS
     */
    const bhWeekends = await getBankHolidayWeekends({
      region: "england-and-wales",
      daysAhead: 180,
    });

    const bhWindows = bhWeekends.slice(0, 3);

    const bhTripItems: Array<{ trip: Trip; contextPrefix: string }> = [];
    for (const bh of bhWindows) {
      for (const origin of ORIGINS) {
        for (const destination of DESTINATIONS) {
          if (origin === destination) continue;

          bhTripItems.push({
            trip: {
              origin,
              destination,
              departDate: bh.startDate,
              returnDate: bh.endDate,
              adults: 1,
            },
            contextPrefix: `bh:${bh.holidayDate}`,
          });
        }
      }
    }

    const cappedBhTripItems = bhTripItems.slice(0, BH_TRIP_CAP);

    const bhDealBatches = await asyncPool(CONCURRENCY, cappedBhTripItems, async (item) => {
      const deals = await buildDealsForTrip(item.trip, CATEGORIES, { maxTotalGBP: STORE_MAX_PRICE_GBP });
      return deals.map((d) => ({ built: d, contextPrefix: item.contextPrefix }));
    });

    const bhDeals = bhDealBatches.flat().flat();

    const bankHolidayByCategory = bhDeals.reduce<Record<string, number>>((acc, x) => {
      acc[x.built.category] = (acc[x.built.category] ?? 0) + 1;
      return acc;
    }, {});

    for (const x of bhDeals) {
      const context = `${x.contextPrefix}:${x.built.category}`;
      const deal = toDeal(x.built);

      const alert = await upsertAndDetectAlert({
        deal,
        context,
        priceDropThresholdGBP: PRICE_DROP_THRESHOLD_GBP,
      });

      if (alert) {
        allAlerts.push(alert);

        if (deal.priceGBP <= ALERT_MAX_PRICE_GBP) actionableAlerts.push(alert);
        else suppressedByBudget += 1;
      }
    }

    // Cheapest first in response
    actionableAlerts.sort((a, b) => a.deal.priceGBP - b.deal.priceGBP);

    return NextResponse.json({
      origins: ORIGINS,
      destinations: DESTINATIONS.length,
      categories: CATEGORIES,
      thresholds: {
        storeMaxGBP: STORE_MAX_PRICE_GBP,
        alertMaxGBP: ALERT_MAX_PRICE_GBP,
        priceDropThresholdGBP: PRICE_DROP_THRESHOLD_GBP,
      },
      checkedTrips: {
        weekend: cappedWeekendTrips.length,
        weekendByCategory,
        bankHolidayTrips: cappedBhTripItems.length,
        bankHolidayWindows: bhWindows.length,
        bankHolidayByCategory,
      },
      alerts: {
        totalDetected: allAlerts.length,
        actionable: actionableAlerts.length,
        suppressedByBudget,
      },
      alertsSample: actionableAlerts.slice(0, 10),
      note: "All price changes are tracked; only deals <= ALERT_MAX_PRICE_GBP are considered actionable (email-worthy). Stays still stubbed.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}