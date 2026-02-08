import { prisma } from "@/lib/db";
import type { Deal } from "@/lib/types/deals";

export type AlertReason = "NEW_DEAL" | "PRICE_DROP";

export type AlertItem = {
  deal: Deal;
  context: string;
  reason: AlertReason;
  dropGBP?: number;
  dropPct?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toReturnDateKey(returnDate: string | null | undefined) {
  // Must be non-nullable for Prisma compound unique input
  return returnDate ?? "";
}

export async function upsertAndDetectAlert(args: {
  deal: Deal;
  context: string;
  priceDropThresholdGBP: number;
  cooldownMs?: number;
}): Promise<AlertItem | null> {
  const { deal, context, priceDropThresholdGBP } = args;
  const cooldownMs = args.cooldownMs ?? DAY_MS;

  const returnDateKey = toReturnDateKey(deal.returnDate);

  const whereKey = {
    context,
    origin: deal.origin,
    destination: deal.destination,
    departDate: deal.departDate,
    returnDateKey,
  };

  const now = new Date();

  const existing = await prisma.dealSeen.findUnique({
    where: {
      deal_seen_key: whereKey,
    },
  });

  if (!existing) {
    await prisma.dealSeen.create({
      data: {
        context,
        origin: deal.origin,
        destination: deal.destination,
        departDate: deal.departDate,
        returnDate: deal.returnDate ?? null,
        returnDateKey,
        lastPrice: deal.priceGBP,
        lastSeenAt: now,
        lastAlertedAt: now,
      },
    });

    return { deal, context, reason: "NEW_DEAL" };
  }

  const drop = existing.lastPrice - deal.priceGBP;
  const dropPct = existing.lastPrice > 0 ? drop / existing.lastPrice : 0;

  const alertedRecently =
    !!existing.lastAlertedAt &&
    now.getTime() - existing.lastAlertedAt.getTime() < cooldownMs;

  const significantDrop = drop >= priceDropThresholdGBP || dropPct >= 0.1;

  if (!alertedRecently && significantDrop) {
    await prisma.dealSeen.update({
      where: {
        deal_seen_key: whereKey,
      },
      data: {
        lastPrice: deal.priceGBP,
        lastSeenAt: now,
        lastAlertedAt: now,
      },
    });

    return {
      deal,
      context,
      reason: "PRICE_DROP",
      dropGBP: drop,
      dropPct,
    };
  }

  await prisma.dealSeen.update({
    where: {
      deal_seen_key: whereKey,
    },
    data: {
      lastSeenAt: now,
      lastPrice: deal.priceGBP,
    },
  });

  return null;
}