import { Resend } from "resend";
import type { Deal } from "@/lib/deals";

const resend = new Resend(process.env.RESEND_API_KEY);

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function sendDealEmail(args: {
  subject: string;
  deals: Deal[];
  heading: string;
}) {
  const to = mustGetEnv("ALERT_TO_EMAIL");
  const from = mustGetEnv("ALERT_FROM_EMAIL");

  const rows = args.deals
    .slice(0, 15)
    .map(
      (d) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.origin} → ${d.destination}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${d.departDate}${d.returnDate ? ` → ${d.returnDate}` : ""}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">£${d.priceGBP.toFixed(0)}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system;">
      <h2 style="margin:0 0 12px;">${escapeHtml(args.heading)}</h2>
      <p style="margin:0 0 16px;color:#444;">Top deals under £${Number(process.env.MAX_PRICE_GBP ?? "150")}.</p>

      <table style="border-collapse:collapse;width:100%;max-width:760px;">
        <thead>
          <tr>
            <th align="left" style="padding:6px 10px;border-bottom:2px solid #ddd;">Route</th>
            <th align="left" style="padding:6px 10px;border-bottom:2px solid #ddd;">Dates</th>
            <th align="left" style="padding:6px 10px;border-bottom:2px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="3" style="padding:10px;">No deals found today.</td></tr>`}</tbody>
      </table>
      <p style="margin-top:16px;color:#666;font-size:12px;">Powered by Amadeus + your impeccable standards.</p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: [to],
    subject: args.subject,
    html,
  });
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
