"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Star, MapPin, UtensilsCrossed, ChevronLeft, ChevronRight, X } from "lucide-react";
import { api } from "@/lib/api";

interface Restaurant {
  restaurantId: string; name: string; rate: number | null;
  cuisines: string | null; locationNeighborhood: string | null;
  onlineOrder: boolean; bookTable: boolean; restType: string | null;
  votes: number; approxCostForTwo: number | null;
}

const NEIGHBORHOODS = [
  "all","Koramangala","Indiranagar","Jayanagar","BTM Layout","HSR Layout",
  "Malleshwaram","Whitefield","Marathahalli","MG Road","Brookefield",
  "Hebbal","Yelahanka","Electronic City","JP Nagar","Banashankari",
  "Bellandur","Sarjapur","Shivajinagar","Basavanagudi","Domlur",
  "Bommanahalli","Nagarbhavi","Bannerghatta Road","KR Puram","Rajajinagar",
];

const PAGE_SIZE = 24;

function ratingBadge(r: number | null) {
  if (!r) return null;
  const color = r >= 4.5 ? "#22c55e" : r >= 4.0 ? "#eab308" : r >= 3.5 ? "#f97316" : "#ef4444";
  return { color, text: r.toFixed(1) };
}

const sel = {
  background: "#111113", border: "1px solid #1f1f23", borderRadius: "8px",
  color: "#a1a1aa", fontSize: "12px", padding: "6px 10px", outline: "none",
};

export default function RestaurantsPage() {
  const router = useRouter();
  const [all, setAll] = useState<Restaurant[]>([]);
  const [filtered, setFiltered] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const [onlineOnly, setOnlineOnly] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/restaurant").then(r => setAll(r.data.restaurants || [])).catch(() => router.push("/login")).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    let r = [...all];
    if (search.trim()) { const s = search.toLowerCase(); r = r.filter(x => x.name?.toLowerCase().includes(s) || x.locationNeighborhood?.toLowerCase().includes(s) || x.cuisines?.toLowerCase().includes(s)); }
    if (minRating !== "all") r = r.filter(x => x.rate != null && x.rate >= parseFloat(minRating));
    if (neighborhood !== "all") r = r.filter(x => x.locationNeighborhood === neighborhood);
    if (onlineOnly === "yes") r = r.filter(x => x.onlineOrder);
    else if (onlineOnly === "no") r = r.filter(x => !x.onlineOrder);
    setFiltered(r); setPage(1);
  }, [search, minRating, neighborhood, onlineOnly, all]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const anyFilter = search || minRating !== "all" || neighborhood !== "all" || onlineOnly !== "all";
  const clear = () => { setSearch(""); setMinRating("all"); setNeighborhood("all"); setOnlineOnly("all"); };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#09090b", color: "#e4e4e7" }}>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#a1a1aa" }}>Restaurants</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#3f3f46" }}>
              {loading ? "Loading…" : `${filtered.length.toLocaleString()} of ${all.length.toLocaleString()} in Bengaluru`}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "#3f3f46" }} />
              <input
                placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 h-8 w-44 text-[12px] rounded-lg focus:outline-none"
                style={{ background: "#111113", border: "1px solid #1f1f23", color: "#a1a1aa" }}
              />
            </div>
            <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)} style={sel}>
              {NEIGHBORHOODS.map(n => <option key={n} value={n} style={{ background: "#111113" }}>{n === "all" ? "All Areas" : n}</option>)}
            </select>
            <select value={minRating} onChange={e => setMinRating(e.target.value)} style={sel}>
              <option value="all" style={{ background: "#111113" }}>All Ratings</option>
              {["4.5","4.0","3.5","3.0"].map(v => <option key={v} value={v} style={{ background: "#111113" }}>{v}+ Stars</option>)}
            </select>
            <select value={onlineOnly} onChange={e => setOnlineOnly(e.target.value)} style={sel}>
              <option value="all" style={{ background: "#111113" }}>All Modes</option>
              <option value="yes" style={{ background: "#111113" }}>Online Only</option>
              <option value="no" style={{ background: "#111113" }}>Walk-in</option>
            </select>
            {anyFilter && (
              <button onClick={clear} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ color: "#52525b", background: "#111113", border: "1px solid #1f1f23" }}>
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#818cf8" }} />
          </div>
        ) : pageData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-lg" style={{ background: "#111113", border: "1px solid #1f1f23" }}>
            <UtensilsCrossed className="h-6 w-6 mb-3" style={{ color: "#3f3f46" }} />
            <p className="text-[13px] font-medium" style={{ color: "#71717a" }}>No results found</p>
            <p className="text-[11px] mt-1 mb-4" style={{ color: "#3f3f46" }}>Try adjusting your filters</p>
            <button onClick={clear} className="rounded-lg px-3 py-1.5 text-[11px]" style={{ background: "#1a1a1f", border: "1px solid #27272a", color: "#818cf8" }}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {pageData.map(r => {
                const badge = ratingBadge(r.rate);
                const cuisines = r.cuisines?.split(",").slice(0, 2).map(c => c.trim()) ?? [];
                return (
                  <div
                    key={r.restaurantId}
                    onClick={() => router.push(`/restaurant/${r.restaurantId}`)}
                    className="flex flex-col gap-2.5 p-3.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "#111113", border: "1px solid #1f1f23" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLElement).style.background = "#141417"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1f1f23"; (e.currentTarget as HTMLElement).style.background = "#111113"; }}
                  >
                    {/* Name + rating */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-medium leading-snug line-clamp-2 flex-1" style={{ color: "#e4e4e7" }}>{r.name}</p>
                      {badge && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-2.5 w-2.5" style={{ color: badge.color, fill: badge.color }} />
                          <span className="text-[11px] tabular-nums font-medium" style={{ color: badge.color }}>{badge.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: "#3f3f46" }} />
                      <p className="text-[11px] truncate" style={{ color: "#71717a" }}>{r.locationNeighborhood ?? "Unknown"}</p>
                      {r.votes > 0 && <span className="ml-auto text-[10px] tabular-nums shrink-0" style={{ color: "#3f3f46" }}>{r.votes.toLocaleString()}</span>}
                    </div>

                    {/* Cuisines */}
                    {cuisines.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cuisines.map(c => (
                          <span key={c} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "#1a1a1f", color: "#52525b" }}>{c}</span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      {r.onlineOrder && <span className="text-[10px]" style={{ color: "#22c55e" }}>Online</span>}
                      {r.bookTable && <span className="text-[10px]" style={{ color: "#818cf8" }}>Reserve</span>}
                      {r.approxCostForTwo && <span className="ml-auto text-[10px] tabular-nums" style={{ color: "#3f3f46" }}>₹{r.approxCostForTwo} / 2</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px]" style={{ color: "#3f3f46" }}>Page {page} of {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] disabled:opacity-30 transition-opacity"
                    style={{ background: "#111113", border: "1px solid #1f1f23", color: "#71717a" }}>
                    <ChevronLeft className="h-3 w-3" /> Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = page <= 3 ? i + 1 : page + i - 2;
                    if (pg < 1 || pg > totalPages) return null;
                    const active = pg === page;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className="h-8 w-8 rounded-lg text-[11px] font-medium transition-colors"
                        style={{ background: active ? "#818cf8" : "#111113", border: `1px solid ${active ? "#818cf8" : "#1f1f23"}`, color: active ? "#fff" : "#71717a" }}>
                        {pg}
                      </button>
                    );
                  })}
                  <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] disabled:opacity-30 transition-opacity"
                    style={{ background: "#111113", border: "1px solid #1f1f23", color: "#71717a" }}>
                    Next <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
