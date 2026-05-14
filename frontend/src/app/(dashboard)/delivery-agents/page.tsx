"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Bike, Star, Navigation, ChevronLeft, ChevronRight, X, Users } from "lucide-react";
import { api } from "@/lib/api";

interface Agent {
  deliveryPersonId: string; firstName: string; lastName: string;
  phone: string | null; age: number | null; ratings: string | null;
  vehicleType: string | null; vehicleCondition: number | null;
  status: string; currentLatitude: string | null; currentLongitude: string | null;
  totalDeliveries: number; city: string;
}

const PAGE_SIZE = 30;

function statusDot(s: string) {
  if (s === "Available")  return "#22c55e";
  if (s === "On Delivery") return "#eab308";
  return "#52525b";
}

function ratingColor(r: string | null) {
  const v = parseFloat(r || "0");
  if (v >= 4.5) return "#22c55e";
  if (v >= 4.0) return "#eab308";
  if (v >= 3.5) return "#f97316";
  return "#71717a";
}

const sel = {
  background: "#111113", border: "1px solid #1f1f23", borderRadius: "8px",
  color: "#a1a1aa", fontSize: "12px", padding: "6px 10px", outline: "none",
};

export default function DeliveryAgentsPage() {
  const router = useRouter();
  const [all, setAll] = useState<Agent[]>([]);
  const [filtered, setFiltered] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [vehicle, setVehicle] = useState("all");
  const [sortBy, setSortBy] = useState("deliveries");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/delivery-partner").then(r => setAll(r.data.agents || [])).catch(() => router.push("/login")).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    let r = [...all];
    if (search.trim()) { const s = search.toLowerCase(); r = r.filter(a => `${a.firstName} ${a.lastName}`.toLowerCase().includes(s) || a.deliveryPersonId.toLowerCase().includes(s)); }
    if (status !== "all") r = r.filter(a => a.status === status);
    if (vehicle !== "all") r = r.filter(a => a.vehicleType === vehicle);
    if (sortBy === "deliveries") r.sort((a, b) => b.totalDeliveries - a.totalDeliveries);
    else if (sortBy === "rating") r.sort((a, b) => parseFloat(b.ratings || "0") - parseFloat(a.ratings || "0"));
    else r.sort((a, b) => a.firstName.localeCompare(b.firstName));
    setFiltered(r); setPage(1);
  }, [search, status, vehicle, sortBy, all]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts = {
    available: all.filter(a => a.status === "Available").length,
    onDelivery: all.filter(a => a.status === "On Delivery").length,
    offline: all.filter(a => a.status === "Offline").length,
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#09090b", color: "#e4e4e7" }}>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#a1a1aa" }}>Delivery Agents</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#3f3f46" }}>
              {loading ? "Loading…" : `${filtered.length.toLocaleString()} of ${all.length.toLocaleString()} agents`}
            </p>
          </div>

          {!loading && (
            <div className="flex items-center gap-3 text-[11px]" style={{ color: "#52525b" }}>
              {[["Available", counts.available, "#22c55e"], ["On Delivery", counts.onDelivery, "#eab308"], ["Offline", counts.offline, "#3f3f46"]].map(([label, count, color]) => (
                <button key={label as string}
                  onClick={() => setStatus(status === label ? "all" : label as string)}
                  className="flex items-center gap-1.5 transition-opacity"
                  style={{ opacity: status !== "all" && status !== label ? 0.4 : 1 }}
                >
                  <span className="h-1.5 w-1.5 rounded-md" style={{ background: color as string }} />
                  {label} · {count}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "#3f3f46" }} />
            <input placeholder="Name or ID…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 h-8 w-44 text-[12px] rounded-lg focus:outline-none"
              style={{ background: "#111113", border: "1px solid #1f1f23", color: "#a1a1aa" }}
            />
          </div>
          <select value={vehicle} onChange={e => setVehicle(e.target.value)} style={sel}>
            <option value="all" style={{ background: "#111113" }}>All Vehicles</option>
            <option value="motorcycle" style={{ background: "#111113" }}>Motorcycle</option>
            <option value="scooter" style={{ background: "#111113" }}>Scooter</option>
            <option value="electric_scooter" style={{ background: "#111113" }}>Electric Scooter</option>
            <option value="bicycle" style={{ background: "#111113" }}>Bicycle</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}>
            <option value="deliveries" style={{ background: "#111113" }}>Most Deliveries</option>
            <option value="rating" style={{ background: "#111113" }}>Highest Rating</option>
            <option value="name" style={{ background: "#111113" }}>Name A–Z</option>
          </select>
          {(search || status !== "all" || vehicle !== "all") && (
            <button onClick={() => { setSearch(""); setStatus("all"); setVehicle("all"); }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px]"
              style={{ color: "#52525b", background: "#111113", border: "1px solid #1f1f23" }}>
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#818cf8" }} />
          </div>
        ) : pageData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-lg" style={{ background: "#111113", border: "1px solid #1f1f23" }}>
            <Users className="h-6 w-6 mb-3" style={{ color: "#3f3f46" }} />
            <p className="text-[13px] font-medium" style={{ color: "#71717a" }}>No agents found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {pageData.map(agent => (
                <div
                  key={agent.deliveryPersonId}
                  onClick={() => router.push(`/delivery-partner/${agent.deliveryPersonId}`)}
                  className="flex flex-col gap-3 p-3.5 rounded-lg cursor-pointer transition-colors"
                  style={{ background: "#111113", border: "1px solid #1f1f23" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#27272a"; (e.currentTarget as HTMLElement).style.background = "#141417"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1f1f23"; (e.currentTarget as HTMLElement).style.background = "#111113"; }}
                >
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: "#1a1a1f" }}>
                        <Bike className="h-3.5 w-3.5" style={{ color: "#71717a" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium leading-tight" style={{ color: "#e4e4e7" }}>{agent.firstName} {agent.lastName}</p>
                        <p className="text-[10px]" style={{ color: "#3f3f46" }}>{agent.deliveryPersonId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-md" style={{ background: statusDot(agent.status) }} />
                      <span className="text-[10px]" style={{ color: "#52525b" }}>{agent.status === "On Delivery" ? "Delivering" : agent.status}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg p-2 text-center" style={{ background: "#0d0d10", border: "1px solid #1a1a1f" }}>
                      <p className="text-[14px] font-semibold tabular-nums" style={{ color: ratingColor(agent.ratings) }}>{agent.ratings ?? "—"}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: "#3f3f46" }}>Rating</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: "#0d0d10", border: "1px solid #1a1a1f" }}>
                      <p className="text-[14px] font-semibold tabular-nums" style={{ color: "#a1a1aa" }}>{agent.totalDeliveries.toLocaleString()}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: "#3f3f46" }}>Deliveries</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[10px]" style={{ color: "#3f3f46" }}>
                    <span className="capitalize">{agent.vehicleType?.replace("_", " ") ?? "—"}</span>
                    {agent.age && <span>Age {agent.age}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px]" style={{ color: "#3f3f46" }}>Page {page} of {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] disabled:opacity-30"
                    style={{ background: "#111113", border: "1px solid #1f1f23", color: "#71717a" }}>
                    <ChevronLeft className="h-3 w-3" /> Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = page <= 3 ? i + 1 : page + i - 2;
                    if (pg < 1 || pg > totalPages) return null;
                    const active = pg === page;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className="h-8 w-8 rounded-lg text-[11px] font-medium"
                        style={{ background: active ? "#818cf8" : "#111113", border: `1px solid ${active ? "#818cf8" : "#1f1f23"}`, color: active ? "#fff" : "#71717a" }}>
                        {pg}
                      </button>
                    );
                  })}
                  <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] disabled:opacity-30"
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
