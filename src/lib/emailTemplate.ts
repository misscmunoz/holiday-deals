export type DealLine = {
    origin: string;
    destination: string;
    departDate: string;
    returnDate: string | null;
    priceGBP: number;
    reason: string;
};

export function buildDealsEmailText(args: {
    heading: string;
    maxPrice: number;
    origins: string[];
    deals: DealLine[];
    stats: { actionable: number; totalDetected: number; suppressedByBudget: number };
}) {
    const lines = args.deals.slice(0, 15).map((d) => {
        const dates = d.returnDate ? `${d.departDate} → ${d.returnDate}` : d.departDate;
        return `• ${d.origin} → ${d.destination} (${dates}) — £${d.priceGBP.toFixed(0)} [${d.reason}]`;
    });

    return [
        args.heading,
        `Under £${args.maxPrice} • Origins: ${args.origins.join(", ")}`,
        "",
        ...lines,
        "",
        "Stats:",
        `- actionable: ${args.stats.actionable}`,
        `- detected: ${args.stats.totalDetected}`,
        `- suppressed by budget: ${args.stats.suppressedByBudget}`,
        "",
    ].join("\n");
}

export function buildDealsEmailHtml(args: {
    heading: string;
    maxPrice: number;
    origins: string[];
    deals: DealLine[];
    stats: { actionable: number; totalDetected: number; suppressedByBudget: number };
    viewUrl?: string;
}) {
    const escapeHtml = (s: string) =>
        s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    const rows = args.deals
        .slice(0, 15)
        .map((d) => {
            const dates = d.returnDate ? `${d.departDate} → ${d.returnDate}` : d.departDate;
            const badgeBg = d.reason === "PRICE_DROP" ? "#fef3c7" : "#dcfce7";
            const badgeFg = d.reason === "PRICE_DROP" ? "#92400e" : "#166534";

            return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;">
            ${escapeHtml(d.origin)} → ${escapeHtml(d.destination)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">
            ${escapeHtml(dates)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:800;color:#0f766e;">
            £${Number(d.priceGBP).toFixed(0)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
            <span style="display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700;background:${badgeBg};color:${badgeFg};">
              ${escapeHtml(d.reason)}
            </span>
          </td>
        </tr>
      `;
        })
        .join("");

    const viewButton = args.viewUrl
        ? `
      <div style="margin-top:16px;text-align:center;">
        <a href="${escapeHtml(args.viewUrl)}" style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;font-size:14px;">
          View full results
        </a>
      </div>
    `
        : "";

    return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Helvetica,Arial,sans-serif;background:#f3f4f6;padding:24px 0;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;padding:20px 24px;">
        <h2 style="margin:0;font-size:22px;font-weight:800;">${escapeHtml(args.heading)}</h2>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">
          Under £${args.maxPrice} • Origins: ${escapeHtml(args.origins.join(", "))}
        </p>
      </div>

      <div style="padding:20px 24px;">
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <thead>
            <tr>
              <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;color:#374151;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Route</th>
              <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;color:#374151;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Dates</th>
              <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;color:#374151;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Price</th>
              <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;color:#374151;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Why</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="padding:16px 12px;color:#6b7280;text-align:center;">No deals found today — rude.</td></tr>`}
          </tbody>
        </table>

        ${viewButton}

        <div style="margin-top:18px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;color:#374151;font-size:13px;">
          <div style="font-weight:800;margin-bottom:6px;">Stats</div>
          <div>Actionable: <b>${args.stats.actionable}</b></div>
          <div>Detected: <b>${args.stats.totalDetected}</b></div>
          <div>Suppressed by budget: <b>${args.stats.suppressedByBudget}</b></div>
        </div>
      </div>

      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        Sent by your holiday gremlin 🧳✨
      </div>
    </div>
  </div>
  `;
}
