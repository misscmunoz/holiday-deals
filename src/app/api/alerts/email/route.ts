import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildDealsEmailHtml, buildDealsEmailText } from "@/lib/emailTemplate";
import { DealLine } from "@/lib/types";
import type { AlertsRunResponse } from "@/lib/types";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function getResend() {
    const key = requireEnv("RESEND_API_KEY");
    return new Resend(key);
}

export async function POST(req: Request) {
    try {
        const secret = requireEnv("CRON_SECRET");
        const got = req.headers.get("x-cron-secret");
        if (got !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const to = requireEnv("ALERT_EMAIL_TO");
        const from = requireEnv("ALERT_EMAIL_FROM");

        const origin = new URL(req.url).origin;
        const baseUrl = process.env.APP_BASE_URL || origin;

        const runRes = await fetch(`${baseUrl}/api/alerts/run`, { cache: "no-store" });
        if (!runRes.ok) throw new Error(`Run endpoint failed: ${runRes.status} ${await runRes.text()}`);

        const json = (await runRes.json()) as AlertsRunResponse;

        if (!json.alerts?.actionable || json.alerts.actionable <= 0) {
            return NextResponse.json({
                sent: false,
                reason: "No actionable alerts",
                debug: json.alerts ?? {},
            });
        }

        const subject = `✈️ ${json.alerts.actionable} deals under £${json.thresholds.alertMaxGBP} (${json.origins.join(", ")})`;

        const deals: DealLine[] = (json.alertsSample ?? []).map((a) => ({
            ...a.deal,
            reason: a.reason,
        }));

        const heading = `${json.alerts.actionable} deals found`;

        const text = buildDealsEmailText({
            heading,
            maxPrice: json.thresholds.alertMaxGBP,
            origins: json.origins,
            deals,
            stats: json.alerts,
        });

        const html = buildDealsEmailHtml({
            heading,
            maxPrice: json.thresholds.alertMaxGBP,
            origins: json.origins,
            deals,
            stats: json.alerts,
            viewUrl: `${baseUrl}/api/alerts/run`,
        });

        const resend = getResend();
        const { data, error } = await resend.emails.send({ from, to, subject, text, html });
        if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);

        return NextResponse.json({ sent: true, id: data?.id, actionable: json.alerts.actionable });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}