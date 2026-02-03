import { prisma } from "@/lib/db";
import type { Deal } from "@/lib/deals";

export type AlertReason = "NEW_DEAL" | "PRICE_DROP";

export type AlertItem = {
  deal: Deal;
  context: string;
  reason: AlertReason;
  dropGBP?: number;
  dropPct?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function upsertAndDetectAlert(args: {
  deal: Deal;
  context: string;
  priceDropThresholdGBP: number;
  cooldownMs?: number;
}): Promise<AlertItem | null> {
  const { deal, context, priceDropThresholdGBP } = args;
  const cooldownMs = args.cooldownMs ?? DAY_MS;

  const key = {
    context,
    origin: deal.origin,
    destination: deal.destination,
    departDate: deal.departDate,
    returnDate: deal.returnDate ?? null,
  };

  const existing = await prisma.dealSeen.findUnique({
    where: {
      context_origin_destination_departDate_returnDate: key,
    },
  });

  const now = new Date();

  if (!existing) {
    await prisma.dealSeen.create({
      data: {
        ...key,
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
    existing.lastAlertedAt &&
    now.getTime() - existing.lastAlertedAt.getTime() < cooldownMs;

  const significantDrop =
    drop >= priceDropThresholdGBP || dropPct >= 0.1;

  if (!alertedRecently && significantDrop) {
    await prisma.dealSeen.update({
      where: {
        context_origin_destination_departDate_returnDate: key,
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

  // Always update "seen" timestamp; update price if it changed but wasn't significant
  await prisma.dealSeen.update({
    where: {
      context_origin_destination_departDate_returnDate: key,
    },
    data: {
      lastSeenAt: now,
      lastPrice: deal.priceGBP,
    },
  });

  return null;
}
