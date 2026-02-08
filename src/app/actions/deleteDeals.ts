'use server';

import { prisma } from "@/lib/db";

export async function deleteDealsByKeys(keys: string[]) {
    for (const key of keys) {
        const [context, origin, destination, departDate, returnDateKey] =
            key.split("::");

        await prisma.dealSeen.deleteMany({
            where: {
                context,
                origin,
                destination,
                departDate,
                returnDateKey: returnDateKey || "",
            },
        });
    }
}