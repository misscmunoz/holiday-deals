import { NextResponse } from "next/server";
import { Resend } from "resend";

type AlertsRunResponse = {
    origins: string[];
    destinations: number;
    thresholds: { alertMaxGBP: number };
    checkedTrips: unknown;
    alerts: { actionable: number; totalDetected: number; suppressedByBudget: number };
    alertsSample: Array<{
        deal: { origin: string; destination: string; departDate: string; returnDate: string | null; priceGBP: number; currency: string };
        context: string;
        reason: string;
    }>;
};

const resend = new Resend(process.env.RESEND_API_KEY);

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function formatLines(sample: AlertsRunResponse["alertsSample"]) {
    return sample
        .map((a) => {
            const d = a.deal;
            const dates = d.returnDate ? `${d.departDate} → ${d.returnDate}` : d.departDate;
            return `• ${d.origin} → ${d.destination} (${dates}) — £${d.priceGBP.toFixed(2)} [${a.reason}]`;
        })
        .join("\n");
}

export async function POST(req: Request) {
    try {
        // Simple shared secret to stop randoms triggering email
        const secret = requireEnv("CRON_SECRET");
        const got = req.headers.get("x-cron-secret");
        if (got !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const to = requireEnv("ALERT_EMAIL_TO");
        const from = requireEnv("ALERT_EMAIL_FROM");

        // Call your existing run endpoint (internal HTTP call keeps wiring simple)
        const baseUrl = requireEnv("APP_BASE_URL"); // e.g. http://localhost:3000 or https://your.vercel.app
        const runRes = await fetch(`${baseUrl}/api/alerts/run`, { cache: "no-store" });
        if (!runRes.ok) throw new Error(`Run endpoint failed: ${runRes.status} ${await runRes.text()}`);
        const json = (await runRes.json()) as AlertsRunResponse;

        if (!json.alerts?.actionable || json.alerts.actionable <= 0) {
            return NextResponse.json({
                sent: false,
                reason: "No actionable alerts",
                debug: {
                    actionable: json.alerts?.actionable ?? 0,
                    totalDetected: json.alerts?.totalDetected ?? 0,
                    suppressedByBudget: json.alerts?.suppressedByBudget ?? 0,
                },
            });
        }

        const subject = `✈️ ${json.alerts.actionable} deals under £${json.thresholds.alertMaxGBP} (${json.origins.join(", ")})`;
        const text =
            `New actionable deals:\n\n` +
            formatLines(json.alertsSample) +
            `\n\nStats:\n` +
            `- actionable: ${json.alerts.actionable}\n` +
            `- detected: ${json.alerts.totalDetected}\n` +
            `- suppressed by budget: ${json.alerts.suppressedByBudget}\n`;

        const { data, error } = await resend.emails.send({
            from,
            to,
            subject,
            text,
        });

        if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);

        return NextResponse.json({ sent: true, id: data?.id, actionable: json.alerts.actionable });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
