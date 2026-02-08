import DealsTable from "./components/DealsTable";
import { getHomepageDeals } from "@/lib/homepageDeals";

export default async function Home() {
  const deals = await getHomepageDeals({ take: 120 });
  const alertMax = Number(process.env.ALERT_MAX_PRICE_GBP ?? "150");
  const origins = (process.env.ORIGINS ?? "MAN")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 64px" }}>
      <header style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          Holiday Deals
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.65)" }}>
          Origins: <b style={{ color: "rgba(255,255,255,0.92)" }}>{origins.join(", ")}</b> • Email budget:{" "}
          <b style={{ color: "rgba(255,255,255,0.92)" }}>£{alertMax}</b>
        </p>
      </header>
      <DealsTable deals={deals} />
    </main>
  );
}