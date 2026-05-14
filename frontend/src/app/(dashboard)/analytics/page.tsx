"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  TrendingUp, Package, Clock, Bike, Cloud,
  Store, Activity, Zap, Award, PartyPopper,
  Loader2, MapPin, Navigation, Wrench,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Minimal monochrome palette ────────────────────────────────────────────────
const MONO = ["#e4e4e7", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"];
const ACCENT = "#818cf8"; // single indigo accent

const TT = {
  contentStyle: { background: "#111113", border: "1px solid #27272a", borderRadius: "8px", color: "#e4e4e7", fontSize: 11 },
  labelStyle: { color: "#71717a" },
  cursor: { fill: "rgba(255,255,255,0.02)" },
};
const TICK = { fontSize: 10, fill: "#52525b" };
const GRID = { strokeDasharray: "3 3", stroke: "#1c1c1f" };

// ── Panel ─────────────────────────────────────────────────────────────────────
function Panel({ title, sub, icon, children }: {
  title: string; sub?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg p-5" style={{ background: "#111113", border: "1px solid #1f1f23" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium" style={{ color: "#a1a1aa" }}>{title}</p>
          {sub && <p className="text-[11px] mt-0.5" style={{ color: "#3f3f46" }}>{sub}</p>}
        </div>
        {icon && <span style={{ color: "#3f3f46" }}>{icon}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1" style={{ background: "#111113", border: "1px solid #1f1f23" }}>
      <p className="text-[11px] uppercase tracking-widest" style={{ color: "#3f3f46" }}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: "#e4e4e7" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[11px]" style={{ color: "#52525b" }}>{sub}</p>}
    </div>
  );
}

// ── Rank list row ─────────────────────────────────────────────────────────────
function RankRow({ rank, name, bar, label, sub }: {
  rank: number; name: string; bar: number; label: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-right text-[10px] tabular-nums shrink-0" style={{ color: rank <= 3 ? ACCENT : "#3f3f46" }}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] truncate" style={{ color: "#a1a1aa" }}>{name}</span>
          <span className="text-[11px] tabular-nums ml-2 shrink-0" style={{ color: "#52525b" }}>{label}</span>
        </div>
        <div className="h-px w-full" style={{ background: "#1f1f23" }}>
          <div className="h-px transition-all" style={{ width: `${bar}%`, background: rank <= 3 ? ACCENT : "#3f3f46" }} />
        </div>
      </div>
      {sub && <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "#3f3f46" }}>{sub}</span>}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Bust stale cache first, then fetch fresh data
    api.post("/analytics/cache-bust")
      .catch(() => {}) // ignore if fails
      .finally(() => {
        api.get("/analytics")
          .then(r => setData(r.data))
          .catch(() => { setError(true); router.push("/login"); })
          .finally(() => setLoading(false));
      });
  }, [router]);

  const totalOrders = useMemo(
    () => data ? (data.ordersByWeather as any[]).reduce((s: number, r: any) => s + r.count, 0) : 0,
    [data]
  );
  const overallAvgTime = useMemo(
    () => data
      ? parseFloat(((data.avgTimeByTraffic as any[]).reduce((s: number, r: any) => s + r.avgTime, 0) / (data.avgTimeByTraffic as any[]).length).toFixed(1))
      : 0,
    [data]
  );
  const bestRestaurant = useMemo(() => data ? (data.topRestaurants as any[])[0] : null, [data]);
  const bestAgent = useMemo(() => data ? (data.topAgents as any[])[0] : null, [data]);

  const hoursData = useMemo(() => {
    if (!data) return [];
    const map: Record<number, number> = {};
    for (const h of data.ordersByHour as any[]) map[h.hour] = h.count;
    return Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}`, orders: map[i] || 0 }));
  }, [data]);

  const festivalRow = useMemo(() => data ? (data.festivalImpact as any[]).find((r: any) => r.festival === true) : null, [data]);
  const normalRow = useMemo(() => data ? (data.festivalImpact as any[]).find((r: any) => r.festival === false) : null, [data]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#09090b" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
          <p className="text-[12px]" style={{ color: "#52525b" }}>Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#09090b" }}>
        <p className="text-[13px]" style={{ color: "#52525b" }}>Failed to load analytics.</p>
      </div>
    );
  }

  const distData: any[] = data.distanceVsTime || [];
  const neighData: any[] = data.ordersByNeighborhood || [];
  const prepData: any[] = data.prepTimeByOrderType || [];
  const vcData: any[] = data.vehicleConditionImpact || [];

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#09090b", color: "#e4e4e7" }}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold" style={{ color: "#e4e4e7" }}>Analytics</h1>
            <p className="text-[12px] mt-0.5" style={{ color: "#3f3f46" }}>
              {totalOrders.toLocaleString()} orders · Bengaluru
            </p>
          </div>
          <div className="h-px flex-1 mx-6" style={{ background: "#1f1f23" }} />
          <span className="text-[11px]" style={{ color: "#3f3f46" }}>Live dataset</span>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total Orders" value={totalOrders} sub="all time" />
          <Stat label="Avg Delivery" value={`${overallAvgTime} min`} sub="across all traffic" />
          <Stat label="Top Restaurant" value={bestRestaurant?.name ?? "—"} sub={bestRestaurant ? `${bestRestaurant.orderCount.toLocaleString()} orders` : ""} />
          <Stat label="Top Agent" value={bestAgent?.name ?? "—"} sub={bestAgent ? `${bestAgent.orderCount.toLocaleString()} deliveries` : ""} />
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "#3f3f46" }}>Operations</span>
          <div className="h-px flex-1" style={{ background: "#1f1f23" }} />
        </div>

        {/* ── Row: Orders by Hour + Delivery Time Dist ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Order Volume by Hour" sub="24-hour demand pattern" icon={<Zap className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={hoursData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#3f3f46" }} interval={3} />
                <YAxis tick={TICK} width={36} />
                <Tooltip {...TT} formatter={(v: any) => [Number(v).toLocaleString(), "Orders"]} />
                <Area type="monotone" dataKey="orders" stroke={ACCENT} fill="url(#hg)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Delivery Time Distribution" sub="Time bucket breakdown" icon={<Clock className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.deliveryTimeDistribution} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "#3f3f46" }} />
                <YAxis tick={TICK} width={36} />
                <Tooltip {...TT} formatter={(v: any) => [Number(v).toLocaleString(), "Orders"]} />
                <Bar dataKey="count" fill={ACCENT} radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* ── Row: Weather + Traffic ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Orders by Weather" sub="Demand across weather conditions" icon={<Cloud className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.ordersByWeather} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="weather" tick={{ fontSize: 9, fill: "#3f3f46" }} />
                <YAxis tick={TICK} width={36} />
                <Tooltip {...TT} formatter={(v: any) => [Number(v).toLocaleString(), "Orders"]} />
                <Bar dataKey="count" fill="#52525b" radius={[3, 3, 0, 0]}>
                  {(data.ordersByWeather as any[]).map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? ACCENT : MONO[i % MONO.length]} opacity={i === 0 ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Avg Delivery Time vs Traffic" sub="Minutes by congestion level" icon={<Activity className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.avgTimeByTraffic} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="traffic" tick={{ fontSize: 9, fill: "#3f3f46" }} />
                <YAxis unit="m" tick={TICK} width={36} />
                <Tooltip {...TT} formatter={(v: any) => [`${v} min`, "Avg Time"]} />
                <Bar dataKey="avgTime" radius={[3, 3, 0, 0]}>
                  {(data.avgTimeByTraffic as any[]).map((_: any, i: number) => (
                    <Cell key={i} fill={MONO[i % MONO.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "#3f3f46" }}>Leaderboards</span>
          <div className="h-px flex-1" style={{ background: "#1f1f23" }} />
        </div>

        {/* ── Top Restaurants + Top Agents ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Top 10 Restaurants" sub="Ranked by total order volume" icon={<Award className="h-4 w-4" />}>
            <div className="space-y-3">
              {(data.topRestaurants as any[]).map((r: any, i: number) => (
                <RankRow
                  key={r.restaurantId}
                  rank={i + 1}
                  name={r.name}
                  bar={(r.orderCount / (data.topRestaurants as any[])[0].orderCount) * 100}
                  label={`${r.orderCount.toLocaleString()}`}
                  sub={`${r.avgTime}m`}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Top 10 Delivery Agents" sub="Ranked by completed deliveries" icon={<Bike className="h-4 w-4" />}>
            <div className="space-y-3">
              {(data.topAgents as any[]).map((a: any, i: number) => (
                <RankRow
                  key={a.deliveryPersonId}
                  rank={i + 1}
                  name={a.name}
                  bar={(a.orderCount / (data.topAgents as any[])[0].orderCount) * 100}
                  label={`${a.orderCount.toLocaleString()}`}
                  sub={`${a.avgTime}m`}
                />
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Vehicle Type + Order Type ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Deliveries by Vehicle Type" sub="Order count and average time per vehicle" icon={<Bike className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.ordersByVehicle} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 10 }}>
                <CartesianGrid {...GRID} />
                <XAxis type="number" tick={TICK} />
                <YAxis type="category" dataKey="vehicle" tick={{ fontSize: 10, fill: "#3f3f46" }} width={100} />
                <Tooltip {...TT} formatter={(v: any) => [Number(v).toLocaleString(), "Orders"]} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {(data.ordersByVehicle as any[]).map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? ACCENT : MONO[i % MONO.length]} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Orders by Type" sub="Category breakdown with prep performance" icon={<Package className="h-4 w-4" />}>
            <div className="space-y-3 mt-1">
              {(data.ordersByType as any[]).map((r: any, i: number) => (
                <RankRow
                  key={r.type}
                  rank={i + 1}
                  name={r.type}
                  bar={(r.count / (data.ordersByType as any[])[0].count) * 100}
                  label={`${Number(r.count).toLocaleString()}`}
                  sub={`${r.avgTime}m`}
                />
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Festival Impact ── */}
        {festivalRow && normalRow && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "#3f3f46" }}>Contextual</span>
              <div className="h-px flex-1" style={{ background: "#1f1f23" }} />
            </div>
            <Panel title="Festival vs Normal Day Impact" icon={<PartyPopper className="h-4 w-4" />}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Orders (Festival)", value: Number(festivalRow.count).toLocaleString() },
                  { label: "Avg Time (Festival)", value: `${festivalRow.avgTime} min` },
                  { label: "Orders (Normal)", value: Number(normalRow.count).toLocaleString() },
                  { label: "Avg Time (Normal)", value: `${normalRow.avgTime} min` },
                ].map(item => (
                  <div key={item.label} className="rounded p-3" style={{ background: "#0d0d10", border: "1px solid #1f1f23" }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "#3f3f46" }}>{item.label}</p>
                    <p className="text-xl font-semibold tabular-nums mt-1" style={{ color: "#a1a1aa" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] mt-4" style={{ color: "#3f3f46" }}>
                Festival days:{" "}
                <span style={{ color: festivalRow.avgTime > normalRow.avgTime ? "#f59e0b" : "#6ee7b7" }}>
                  {festivalRow.avgTime > normalRow.avgTime ? "+" : ""}{(festivalRow.avgTime - normalRow.avgTime).toFixed(1)} min
                </span>{" "}
                delivery time vs normal days
              </p>
            </Panel>
          </>
        )}

      </div>
    </div>
  );
}
