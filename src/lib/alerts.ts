import { prisma } from "@/lib/db";
import type { Deal } from "@/lib/types/deals";
import type { AlertItem } from "@/lib/types/alerts";


const DAY_MS = 24 * 60 * 60 * 1000;

function toReturnDateKey(returnDate: string | null | undefined) {
  return returnDate ?? ""; // non-nullable for compound unique key
}

export async function upsertAndDetectAlert(args: {
  deal: Deal;
  context: string;
  priceDropThresholdGBP: number;
  cooldownMs?: number;
}): Promise<AlertItem | null> {
  const { deal, context, priceDropThresholdGBP } = args;
  const cooldownMs = args.cooldownMs ?? DAY_MS;

  const now = new Date();
  const returnDateKey = toReturnDateKey(deal.returnDate);

  const whereKey = {
    context: context,
    origin: deal.origin,
    destination: deal.destination,
    departDate: deal.departDate,
    returnDateKey,
  };


  // First, fetch existing so we can decide what alert to emit
  const existing = await prisma.dealSeen.findUnique({
    where: { deal_seen_key: whereKey },
  });

  // If it's brand new, create (via upsert to avoid races) and alert NEW_DEAL
  if (!existing) {
    await prisma.dealSeen.upsert({
      where: { deal_seen_key: whereKey },
      create: {
        context: context,
        origin: deal.origin,
        destination: deal.destination,
        departDate: deal.departDate,
        returnDate: deal.returnDate ?? null,
        returnDateKey,
        lastPrice: deal.priceGBP,
        lastSeenAt: now,
        lastAlertedAt: now,
      },
      update: {
        // if another runner created it first, just update seen/price
        lastSeenAt: now,
        lastPrice: deal.priceGBP,
      },
    });

    return { deal, context, reason: "NEW_DEAL" };
  }

  const dropGBP = existing.lastPrice - deal.priceGBP;
  const dropPct = existing.lastPrice > 0 ? dropGBP / existing.lastPrice : 0;

  const alertedRecently =
    !!existing.lastAlertedAt &&
    now.getTime() - existing.lastAlertedAt.getTime() < cooldownMs;

  const significantDrop = dropGBP >= priceDropThresholdGBP || dropPct >= 0.1;

  if (!alertedRecently && significantDrop) {
    await prisma.dealSeen.update({
      where: { deal_seen_key: whereKey },
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
      dropGBP,
      dropPct,
    };
  }

  // always update lastSeen / lastPrice
  await prisma.dealSeen.update({
    where: { deal_seen_key: whereKey },
    data: {
      lastSeenAt: now,
      lastPrice: deal.priceGBP,
    },
  });

  return null;
}