"use client";import { useState, useEffect } from "react";export default function DekaPredictPage() {
  const [timeFilter, setTimeFilter] = useState("all");
  const [coinFilter, setCoinFilter] = useState("all");
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);  useEffect(() => {
    async function fetchMarkets() {
      try {
        setLoading(true);
        const res = await fetch(
          "https://api.limitless.exchange/markets/active?limit=50"
        );
        const data = await res.json();
        setMarkets(data.data || data || []);
      } catch (error) {
        console.error(error);
        setMarkets([]);
      } finally {
        setLoading(false);
      }
    }fetchMarkets();
const interval = setInterval(fetchMarkets, 30000);
return () => clearInterval(interval);  }, []);  const filteredMarkets = markets.filter((market: any) => {
    const title = (market.title || market.question || "").toLowerCase();const timeMatch =
  timeFilter === "all" ||
  (timeFilter === "15m" && title.includes("15")) ||
  (timeFilter === "hourly" &&
    (title.includes("hour") || title.includes("hourly"))) ||
  (timeFilter === "daily" &&
    (title.includes("daily") || title.includes("day")));

const coinMatch =
  coinFilter === "all" ||
  (coinFilter === "bitcoin" &&
    (title.includes("bitcoin") || title.includes("btc"))) ||
  (coinFilter === "ethereum" &&
    (title.includes("ethereum") || title.includes("eth"))) ||
  (coinFilter === "solana" &&
    (title.includes("solana") || title.includes("sol"))) ||
  (coinFilter === "xrp" &&
    (title.includes("xrp") || title.includes("ripple")));

return timeMatch && coinMatch;  });  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DekaPredict</h1>
          <p className="text-gray-400">
            Live crypto predictions powered by Limitless on Base
          </p>
        </div>    <div className="flex flex-wrap gap-3 mb-6">
      {["all", "15m", "hourly", "daily"].map((item) => (
        <button
          key={item}
          onClick={() => setTimeFilter(item)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            timeFilter === item
              ? "bg-blue-600"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {item === "all"
            ? "All"
            : item === "15m"
            ? "15m"
            : item === "hourly"
            ? "Hourly"
            : "Daily"}
        </button>
      ))}
    </div>

    <div className="flex flex-wrap gap-3 mb-8">
      {["all", "bitcoin", "ethereum", "solana", "xrp"].map((item) => (
        <button
          key={item}
          onClick={() => setCoinFilter(item)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            coinFilter === item
              ? "bg-blue-600"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {item === "all"
            ? "All"
            : item.charAt(0).toUpperCase() + item.slice(1)}
        </button>
      ))}
    </div>

    {loading ? (
      <div className="text-center py-20 text-gray-500">
        Loading markets...
      </div>
    ) : filteredMarkets.length === 0 ? (
      <div className="text-center py-20 text-gray-500">
        No markets found
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMarkets.map((market: any) => {
          const upPrice =
            market.outcomes?.[0]?.price || market.yesPrice || 0.5;
          const upPercent = Math.round(upPrice * 100);
          const downPercent = 100 - upPercent;

          return (
            <div
              key={market.id || market.slug}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg leading-tight pr-4">
                  {market.title || market.question}
                </h3>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full whitespace-nowrap">
                  Live
                </span>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Up / Yes</span>
                    <span className="font-medium">{upPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${upPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Down / No</span>
                    <span className="font-medium">{downPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${downPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>
                  Volume: $
                  {market.volume
                    ? (Number(market.volume) / 1000).toFixed(1) + "K"
                    : "—"}
                </span>
                <span>
                  {market.endDate
                    ? new Date(market.endDate).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>  );
}

